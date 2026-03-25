import { uploadContactToSalesforge } from './bridge'

async function main() {
  const args = process.argv.slice(2)
  const idArg = args.findIndex(a => a === '--company-id')
  
  if (idArg === -1 || !args[idArg + 1]) {
    console.error('Usage: npx ts-node src/salesforge-bridge/cli.ts --company-id <uuid>')
    process.exit(1)
  }

  const companyId = args[idArg + 1]

  try {
    const contactId = await uploadContactToSalesforge(companyId)
    if (!contactId) {
      console.log('[cli] Upload aborted (DNC or Invalid email).')
    }
    process.exit(0)
  } catch (err: any) {
    console.error(`[Fatal] ${err.message}`)
    process.exit(1)
  }
}

main()
