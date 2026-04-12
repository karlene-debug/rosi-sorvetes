-- Migration v13: Descontos detalhados na folha de pagamento
-- Rodar no Supabase SQL Editor

ALTER TABLE folha_pagamento ADD COLUMN IF NOT EXISTS desconto_inss DECIMAL(10,2) DEFAULT 0;
ALTER TABLE folha_pagamento ADD COLUMN IF NOT EXISTS desconto_irrf DECIMAL(10,2) DEFAULT 0;
ALTER TABLE folha_pagamento ADD COLUMN IF NOT EXISTS desconto_adiantamento DECIMAL(10,2) DEFAULT 0;
ALTER TABLE folha_pagamento ADD COLUMN IF NOT EXISTS desconto_faltas DECIMAL(10,2) DEFAULT 0;
ALTER TABLE folha_pagamento ADD COLUMN IF NOT EXISTS desconto_sindicato DECIMAL(10,2) DEFAULT 0;
ALTER TABLE folha_pagamento ADD COLUMN IF NOT EXISTS desconto_outros DECIMAL(10,2) DEFAULT 0;
