// Regressão visual no Linux, em qualquer sistema: roda os testes @visual na
// imagem Docker oficial do Playwright (mesma versão do projeto). As baselines
// só batem com o Linux do CI porque cada sistema rasteriza texto diferente.
//
// Uso: npm run test:visual            (compara)
//      npm run test:visual:update     (regrava as baselines)
// Argumentos extras vão para o `playwright test`.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const { version } = createRequire(import.meta.url)('@playwright/test/package.json')
const args = process.argv.slice(2).join(' ')

const result = spawnSync(
  'docker',
  [
    'run', '--rm', '--ipc=host', '-e', 'CI=1',
    '-v', `${root}:/work`,
    // node_modules próprio do Linux: os binários nativos (rolldown, oxlint) dependem do sistema.
    '-v', 'kurio-playwright-node-modules:/work/node_modules',
    '-w', '/work',
    `mcr.microsoft.com/playwright:v${version}-noble`,
    'bash', '-c',
    `npm ci --no-audit --no-fund --loglevel=error && npx playwright test --grep @visual --output=test-results/linux ${args}`,
  ],
  { stdio: 'inherit', env: { ...process.env, MSYS_NO_PATHCONV: '1' } },
)
if (result.error) {
  console.error('Não foi possível rodar o Docker. Ele está instalado e em execução?', result.error.message)
  process.exit(1)
}
process.exit(result.status ?? 1)
