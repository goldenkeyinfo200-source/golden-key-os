param(
    [Parameter(Mandatory=$true)]
    [string]$OutputPath,

    [int]$Dpi = 300,

    [ValidateSet("color","grayscale")]
    [string]$ColorMode = "color"
)

$ErrorActionPreference = "Stop"

# WIA CommonDialog Windows'нинг ўзига тегишли scanner UI'ни очади.
# Фойдаланувчи сканерни танлайди ва Scan тугмасини босади.
$dialog = New-Object -ComObject WIA.CommonDialog

# 1 = Scanner device type
$device = $dialog.ShowSelectDevice(1, $true, $false)

if ($null -eq $device) {
    throw "Scanner танланмади."
}

$item = $device.Items.Item(1)

# WIA property IDs:
# 6147 Horizontal Resolution
# 6148 Vertical Resolution
# 6146 Current Intent: 1=color, 2=grayscale
try { $item.Properties.Item(6147).Value = $Dpi } catch {}
try { $item.Properties.Item(6148).Value = $Dpi } catch {}

if ($ColorMode -eq "grayscale") {
    try { $item.Properties.Item(6146).Value = 2 } catch {}
} else {
    try { $item.Properties.Item(6146).Value = 1 } catch {}
}

# JPEG format ID
$jpegFormat = "{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}"

$image = $dialog.ShowTransfer($item, $jpegFormat, $true)

if ($null -eq $image) {
    throw "Сканерлаш бекор қилинди."
}

$image.SaveFile($OutputPath)

Write-Output $OutputPath
