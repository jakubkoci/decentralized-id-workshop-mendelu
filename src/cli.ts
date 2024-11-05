async function main() {
  console.log('Welcome to the Decentralized Digital Identity Workshop!')

  // TODO Initialize agent

  const [command] = process.argv.slice(2)

  switch (command) {
    case 'list': {
      // TODO
      console.log('Not implemented yet')
      break
    }
    case 'receive': {
      // TODO
      console.log('Not implemented yet')
      break
    }
    case 'present': {
      // TODO
      console.log('Not implemented yet')
      break
    }
    default: {
      if (command) console.log('\nUnknown command\n', command)
      break
    }
  }
}

main()
