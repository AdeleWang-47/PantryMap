const { BlobServiceClient, generateBlobSASQueryParameters, ContainerSASPermissions, SASProtocol, StorageSharedKeyCredential } = require('@azure/storage-blob');

function getStorageConfig() {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT;
  const accountKey = process.env.AZURE_STORAGE_KEY;
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  return { accountName, accountKey, connectionString };
}

async function ensureContainer(containerName) {
  const { accountName, connectionString } = getStorageConfig();
  if (!accountName && !connectionString) throw new Error('Storage account not configured');
  const client = connectionString
    ? BlobServiceClient.fromConnectionString(connectionString)
    : new BlobServiceClient(`https://${accountName}.blob.core.windows.net/`);
  const containerClient = client.getContainerClient(containerName);
  await containerClient.createIfNotExists();
}

async function generateBlobSasUrl(containerName, blobName, contentType, expiresInMinutes = 15) {
  const { accountName, accountKey, connectionString } = getStorageConfig();
  if (!accountName || (!accountKey && !connectionString)) {
    throw new Error('Missing storage credentials. Set AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_KEY or connection string.');
  }

  // Ensure container exists
  await ensureContainer(containerName);

  const startsOn = new Date();
  const expiresOn = new Date(startsOn.getTime() + expiresInMinutes * 60 * 1000);

  const sharedKey = new StorageSharedKeyCredential(accountName, accountKey);
  const sas = generateBlobSASQueryParameters({
    containerName,
    blobName,
    permissions: ContainerSASPermissions.parse('cw'), // create + write
    startsOn,
    expiresOn,
    protocol: SASProtocol.Https
  }, sharedKey).toString();

  const uploadUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sas}`;
  const publicUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}`;
  return { uploadUrl, publicUrl };
}

module.exports = { generateBlobSasUrl };





