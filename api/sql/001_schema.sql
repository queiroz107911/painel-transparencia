IF DB_ID('painel') IS NULL 
        CREATE DATABASE painel;
GO

USE painel;
GO

IF OBJECT_ID('dbo.stg_contratacao') IS NULL
CREATE TABLE dbo.stg_contratacao (
    numero_controle_pncp NVARCHAR(50)  NULL,
    orgao_cnpj           VARCHAR(14)   NULL,
    orgao_razao_social   NVARCHAR(300) NULL,
    uf                   CHAR(2)       NULL,
    modalidade_codigo    INT           NULL,
    modalidade_nome      NVARCHAR(100) NULL,
    objeto               NVARCHAR(MAX) NULL,
    valor_total_estimado DECIMAL(18,2) NULL,
    data_publicacao      DATETIME2     NULL,
    situacao             NVARCHAR(100) NULL

);

GO

IF OBJECT_ID('dbo.orgao') IS NULL
CREATE TABLE dbo.orgao (
    cnpj           VARCHAR(14)   NOT NULL PRIMARY KEY,
    razao_social   NVARCHAR(300) NOT NULL,
    uf             CHAR(2)       NOT NULL
);
GO

IF OBJECT_ID('dbo.contratacao') IS NULL
CREATE TABLE dbo.contratacao (
    numero_controle_pncp NVARCHAR(50)  NOT NULL PRIMARY KEY,
    orgao_cnpj           VARCHAR(14)   NOT NULL,
    modalidade_codigo    INT           NOT NULL,
    modalidade_nome      NVARCHAR(100) NULL,
    objeto               NVARCHAR(MAX) NULL,
    valor_total_estimado DECIMAL(18,2) NULL,
    data_publicacao      DATETIME2     NULL,
    situacao             NVARCHAR(100) NULL,
    CONSTRAINT fk_contratacao_orgao
        FOREIGN KEY (orgao_cnpj) REFERENCES dbo.orgao (cnpj)
);
GO

-- Índices nas colunas usadas como filtro
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_contratacao_data_publicacao')
    CREATE INDEX ix_contratacao_data_publicacao ON dbo.contratacao (data_publicacao);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_contratacao_orgao_cnpj')
    CREATE INDEX ix_contratacao_orgao_cnpj ON dbo.contratacao (orgao_cnpj);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_contratacao_modalidade_codigo')
    CREATE INDEX ix_contratacao_modalidade_codigo ON dbo.contratacao (modalidade_codigo);
GO