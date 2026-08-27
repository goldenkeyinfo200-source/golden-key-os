$ErrorActionPreference = "Stop"

$deviceManager = New-Object -ComObject WIA.DeviceManager
$result = @()

foreach ($info in $deviceManager.DeviceInfos) {
    if ($info.Type -eq 1) {
        $name = $null

        try {
            $name = $info.Properties["Name"].Value
        } catch {
            $name = "Scanner"
        }

        $result += [PSCustomObject]@{
            id   = $info.DeviceID
            name = $name
        }
    }
}

$result | ConvertTo-Json -Compress
