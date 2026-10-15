// Auditoria Lighthouse (seção 10 do desafio). Serve o build otimizado com
// `vite preview`, roda N medições por página e perfil com o Chromium do
// Playwright (versão fixa, reprodutível) e grava relatórios HTML/JSON, o resumo
// com as medianas e as condições de execução em `lighthouse/`.
//
// Uso: npm run audit  (faz o build antes)  ou  node scripts/lighthouse.mjs
import { spawn } from 'node:child_process'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { chromium } from '@playwright/test'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

const root = path.resolve(import.meta.dirname, '..')
const outDir = path.join(root, 'lighthouse')
const reportsDir = path.join(outDir, 'reports')
const config = JSON.parse(await readFile(path.join(outDir, 'config.json'), 'utf8'))
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const METRICS = {
  LCP: 'largest-contentful-paint',
  CLS: 'cumulative-layout-shift',
  TBT: 'total-blocking-time',
  FCP: 'first-contentful-paint',
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/** Sobe o `vite preview` do build otimizado e espera responder. */
async function startPreview() {
  const server = spawn(`npx vite preview --port ${config.port} --strictPort`, {
    cwd: root,
    shell: true,
    stdio: 'ignore',
  })
  const url = `http://localhost:${config.port}`
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch(url)).ok) return { server, url }
    } catch {
      // ainda subindo
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  server.kill()
  throw new Error(`O preview não respondeu em ${url}. Rode "npm run build" antes.`)
}

const { server, url } = await startPreview()
const chrome = await chromeLauncher.launch({
  chromePath: chromium.executablePath(),
  chromeFlags: ['--headless=new', '--no-sandbox'],
})

try {
  await rm(reportsDir, { recursive: true, force: true })
  await mkdir(reportsDir, { recursive: true })
  const results = []

  for (const page of config.pages) {
    for (const profile of config.profiles) {
      const runs = []
      for (let run = 1; run <= config.runs; run++) {
        // Cada medição começa com o storage limpo (padrão do Lighthouse): o MSW
        // registra o service worker e o backend simulado volta ao cenário padrão.
        const result = await lighthouse(
          `${url}${page.path}`,
          { port: chrome.port, output: ['html', 'json'], logLevel: 'error' },
          profile === 'desktop' ? desktopConfig : undefined,
        )
        const base = path.join(reportsDir, `${page.name}-${profile}-${run}`)
        await writeFile(`${base}.report.html`, result.report[0])
        await writeFile(`${base}.report.json`, result.report[1])
        const lhr = result.lhr
        runs.push({
          scores: Object.fromEntries(CATEGORIES.map((id) => [id, Math.round(lhr.categories[id].score * 100)])),
          metrics: Object.fromEntries(Object.entries(METRICS).map(([name, id]) => [name, lhr.audits[id].numericValue])),
        })
        console.log(`${page.name} ${profile} #${run}:`, runs.at(-1).scores)
      }
      // Guarda os relatórios só da medição mediana (por performance): as notas
      // das três ficam no summary.json, e o repositório não carrega 12 relatórios.
      const medianPerf = median(runs.map((r) => r.scores.performance))
      const keep = runs.findIndex((r) => r.scores.performance === medianPerf) + 1
      for (let run = 1; run <= config.runs; run++) {
        const base = path.join(reportsDir, `${page.name}-${profile}-${run}`)
        for (const ext of ['html', 'json']) {
          if (run === keep) await rename(`${base}.report.${ext}`, path.join(reportsDir, `${page.name}-${profile}.report.${ext}`))
          else await rm(`${base}.report.${ext}`)
        }
      }
      results.push({
        page: page.name,
        path: page.path,
        profile,
        median: {
          scores: Object.fromEntries(CATEGORIES.map((id) => [id, median(runs.map((r) => r.scores[id]))])),
          metrics: Object.fromEntries(Object.keys(METRICS).map((name) => [name, median(runs.map((r) => r.metrics[name]))])),
        },
        runs,
      })
    }
  }

  const environment = {
    date: new Date().toISOString(),
    lighthouse: JSON.parse(await readFile(path.join(root, 'node_modules/lighthouse/package.json'), 'utf8')).version,
    chromium: (await chromium.launch().then(async (browser) => {
      const version = browser.version()
      await browser.close()
      return version
    })),
    node: process.version,
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cpu: `${os.cpus()[0]?.model ?? 'desconhecida'} · ${os.cpus().length} núcleos`,
    memory: `${Math.round(os.totalmem() / 1024 ** 3)} GB`,
    conditions:
      'Build de produção (npm run build) servido por vite preview em localhost; mocks MSW no cenário padrão; ' +
      'mobile: emulação Moto G Power e throttling simulado padrão do Lighthouse (4G lento, CPU 4x); ' +
      'desktop: preset desktop do Lighthouse (1350x940, sem throttling de CPU).',
  }
  await writeFile(path.join(outDir, 'summary.json'), JSON.stringify({ environment, targets: config.targets, results }, null, 2))

  const fmt = (name, value) => (name === 'CLS' ? value.toFixed(3) : `${Math.round(value)} ms`)
  const lines = [
    '# Resultados Lighthouse',
    '',
    `Medianas de ${config.runs} medições por página e perfil. Relatórios HTML/JSON da medição mediana em \`lighthouse/reports/\`; as notas de cada medição estão em \`summary.json\`.`,
    '',
    '| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...results.map(
      (r) =>
        `| ${r.page} | ${r.profile} | ${CATEGORIES.map((id) => r.median.scores[id]).join(' | ')} | ${['LCP', 'CLS', 'TBT'].map((m) => fmt(m, r.median.metrics[m])).join(' | ')} |`,
    ),
    '',
    `Metas: Performance ≥ ${config.targets.performance}, Acessibilidade ≥ ${config.targets.accessibility}, Boas práticas ≥ ${config.targets['best-practices']}, SEO ≥ ${config.targets.seo}.`,
    '',
    '## Ambiente',
    '',
    ...Object.entries(environment).map(([key, value]) => `- **${key}**: ${value}`),
    '',
  ]
  await writeFile(path.join(outDir, 'RESULTS.md'), lines.join('\n'))
  console.log(lines.slice(4, 4 + results.length + 2).join('\n'))
} finally {
  await chrome.kill()
  server.kill()
}
