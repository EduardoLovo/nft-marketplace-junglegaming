# Resultados Lighthouse

Medianas de 3 medições por página e perfil. Relatórios HTML/JSON da medição mediana em `lighthouse/reports/`; as notas de cada medição estão em `summary.json`.

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| inicio | mobile | 77 | 96 | 100 | 100 | 4186 ms | 0.001 | 0 ms |
| inicio | desktop | 98 | 96 | 100 | 100 | 965 ms | 0.004 | 0 ms |
| detalhe | mobile | 77 | 100 | 100 | 100 | 4173 ms | 0.000 | 0 ms |
| detalhe | desktop | 98 | 100 | 100 | 100 | 976 ms | 0.000 | 0 ms |

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90.

## Ambiente

- **date**: 2026-10-15T21:48:13.100Z
- **lighthouse**: 12.8.2
- **chromium**: 156.0.8078.4
- **node**: v24.21.0
- **os**: Windows_NT 10.0.26300 (x64)
- **cpu**: AMD Ryzen 5 5600 6-Core Processor               · 12 núcleos
- **memory**: 16 GB
- **conditions**: Build de produção (npm run build) servido por vite preview em localhost; mocks MSW no cenário padrão; mobile: emulação Moto G Power e throttling simulado padrão do Lighthouse (4G lento, CPU 4x); desktop: preset desktop do Lighthouse (1350x940, sem throttling de CPU).
