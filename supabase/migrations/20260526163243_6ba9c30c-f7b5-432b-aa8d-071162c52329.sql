ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS phone_number text;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_acct_phone ON public.bank_accounts(account_number, phone_number);