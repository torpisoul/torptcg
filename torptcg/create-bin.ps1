# Create Products Bin in JSONBin
# This script creates a new bin using your API key

# Load .env file
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1]
        $value = $matches[2]
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

$apiKey = $env:JSONBIN_API_KEY

if (-not $apiKey) {
    Write-Host "ERROR: JSONBIN_API_KEY not found in .env file!" -ForegroundColor Red
    Write-Host "Please add your JSONBin API key to the .env file" -ForegroundColor Yellow
    exit 1
}

Write-Host "Creating new products bin..." -ForegroundColor Cyan

# Read sample data
$sampleData = Get-Content "sample-products.json" -Raw

# Create bin
$headers = @{
    "Content-Type" = "application/json"
    "X-Master-Key" = $apiKey
    "X-Bin-Name"   = "torptcg-products"
}

try {
    $response = Invoke-RestMethod -Uri "https://api.jsonbin.io/v3/b" -Method Post -Headers $headers -Body $sampleData
    $binId = $response.metadata.id

    Write-Host ""
    Write-Host "SUCCESS: Bin created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your new bin ID is:" -ForegroundColor Cyan
    Write-Host $binId -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Open your .env file"
    Write-Host "2. Update: PRODUCTS_BIN_ID=$binId"
    Write-Host "3. Save the file"
    Write-Host "4. Restart netlify dev"
    Write-Host ""

    # Update .env automatically
    $updateEnv = Read-Host "Update .env file automatically? (y/n)"
    if ($updateEnv -eq 'y') {
        $envContent = Get-Content .env
        $newContent = $envContent -replace 'PRODUCTS_BIN_ID=.*', "PRODUCTS_BIN_ID=$binId"
        $newContent | Set-Content .env
        Write-Host "SUCCESS: .env file updated!" -ForegroundColor Green
        Write-Host "Please restart netlify dev" -ForegroundColor Yellow
    }

}
catch {
    Write-Host "ERROR creating bin:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    
    if ($_.Exception.Message -match "401") {
        Write-Host ""
        Write-Host "Your API key appears to be invalid" -ForegroundColor Yellow
        Write-Host "Get your key from: https://jsonbin.io/api-keys"
    }
}
