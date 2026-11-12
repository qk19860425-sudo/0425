-- =====================================================================
-- 報修登記系統：Supabase 建表 SQL
-- 資料表：public.repair_requests
--
-- 這份檔案只用來建立結構，請在 Supabase 的 SQL Editor 手動執行。
-- 安全設計分三層，缺一不可：
--   第 1 層 GRANT：決定 anon 角色「能不能碰這張表、能碰哪些欄位」。
--   第 2 層 RLS  ：決定 anon 「能讀、能新增哪些資料列」。
--   第 3 層 CHECK：不論誰寫入，資料本身都必須符合規則。
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 建立資料表
-- id 與 created_at 由資料庫自動產生，前端不需要也不能填。
-- urgency 預設「中」，status 預設「待處理」。
-- ---------------------------------------------------------------------
create table if not exists public.repair_requests (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null    default now(),
  reporter_name text        not null,
  location      text        not null,
  category      text        not null,
  description   text        not null,
  urgency       text        not null    default '中',
  status        text        not null    default '待處理',

  -- -------------------------------------------------------------------
  -- 第 3 層：CHECK 限制
  -- 選項欄位只能是規定的值。
  -- 文字欄位去掉前後空白後不可為空白，且有長度上限，避免灌入超長內容。
  -- 長度上限是暫定值（需求筆記沒寫），確認後再調整。
  -- -------------------------------------------------------------------
  constraint repair_requests_category_check
    check (category in ('設備', '網路', '環境', '其他')),
  constraint repair_requests_urgency_check
    check (urgency in ('低', '中', '高')),
  constraint repair_requests_status_check
    check (status in ('待處理', '處理中', '已完成')),
  constraint repair_requests_reporter_name_length_check
    check (char_length(btrim(reporter_name)) between 1 and 50),
  constraint repair_requests_location_length_check
    check (char_length(btrim(location)) between 1 and 100),
  constraint repair_requests_description_length_check
    check (char_length(btrim(description)) between 1 and 1000)
);

comment on table  public.repair_requests             is '報修登記（示範用，請勿填寫真實姓名與地點）';
comment on column public.repair_requests.id          is '報修編號，自動產生';
comment on column public.repair_requests.created_at  is '登記時間，自動產生';
comment on column public.repair_requests.reporter_name is '報修人姓名';
comment on column public.repair_requests.location    is '地點或部門';
comment on column public.repair_requests.category    is '類別：設備、網路、環境、其他';
comment on column public.repair_requests.description is '問題說明';
comment on column public.repair_requests.urgency     is '緊急程度：低、中、高，預設中';
comment on column public.repair_requests.status      is '處理狀態：待處理、處理中、已完成，預設待處理';

-- 清單依登記時間由新到舊排序，加索引加快查詢。
create index if not exists repair_requests_created_at_idx
  on public.repair_requests (created_at desc);

-- ---------------------------------------------------------------------
-- 第 1 層：GRANT 權限
-- 這個專案不會自動開放新資料表，所以要明確授權。
-- 先收回所有權限，再只給 anon 需要的部分：
--   - 讀取：整張表（清單要顯示所有欄位）。
--   - 新增：只開放使用者要填的 5 個欄位。
--     id、created_at、status 不開放，新增時一律使用預設值；
--     前端若送出這三個欄位，會直接被拒絕。
--   - 不給 UPDATE、DELETE、TRUNCATE。
-- authenticated（登入使用者）目前沒有任何權限；之後若做管理員登入再另外設計。
-- ---------------------------------------------------------------------
revoke all on table public.repair_requests from public, anon, authenticated;

grant usage on schema public to anon;

grant select on table public.repair_requests to anon;

grant insert (reporter_name, location, category, description, urgency)
  on table public.repair_requests to anon;

-- ---------------------------------------------------------------------
-- 第 2 層：RLS 資料列安全
-- 啟用後，沒有符合任何政策的操作一律被拒絕。
-- 這裡只建立 SELECT 與 INSERT 政策，沒有 UPDATE、DELETE 政策，
-- 所以就算之後權限設錯，也改不了、刪不掉資料。
-- ---------------------------------------------------------------------
alter table public.repair_requests enable row level security;

-- 任何人（anon）都可以讀取清單。
drop policy if exists "任何人可讀取報修清單" on public.repair_requests;
create policy "任何人可讀取報修清單"
  on public.repair_requests
  for select
  to anon
  using (true);

-- 任何人（anon）都可以新增，但新增的資料狀態只能是「待處理」。
-- （第 1 層已不開放 status 欄位，這裡再擋一次，兩層互為備援。）
drop policy if exists "任何人可新增待處理的報修" on public.repair_requests;
create policy "任何人可新增待處理的報修"
  on public.repair_requests
  for insert
  to anon
  with check (status = '待處理');

commit;
