async function main() {
  console.log('Welcome to the Decentralized Digital Identity Workshop!')

  const [command] = process.argv.slice(2)

  switch (command) {
    case 'list': {
      // TODO
      console.log('Not implemented yet')
      break
    }
    case 'present': {
      // TODO
      console.log('Not implemented yet')
      break
    }
    case 'receive': {
      // TODO
      console.log('Not implemented yet')
      break
    }
    default: {
      console.log('\nUnknown command\n', command)
      break
    }
  }
}

main()
