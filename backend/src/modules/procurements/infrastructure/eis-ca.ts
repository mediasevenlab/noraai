import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../../certs/russian-trusted-root.pem')

/** zakupki.gov.ru is signed by the Russian Trusted Root CA, which the default bundle does not include. */
export function russianRootArgs() {
  return existsSync(root) ? ['--cacert', root] : []
}
