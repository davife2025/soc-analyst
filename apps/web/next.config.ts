import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@soc/ui', '@soc/db'],
}

export default config
