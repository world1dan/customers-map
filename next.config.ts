import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    reactCompiler: true,
    experimental: {
        optimizePackageImports: [
            '@phosphor-icons/react',
            '@icons-pack/react-simple-icons',
        ],
    },
}

export default nextConfig
