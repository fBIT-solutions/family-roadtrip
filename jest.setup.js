import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.AZURE_COSMOS_ENDPOINT = 'https://test.documents.azure.com:443'
process.env.AZURE_COSMOS_KEY = 'test-key'
process.env.AZURE_COSMOS_DB_NAME = 'test-db'
