# Native local pairing window. No browser login or credentials in URLs.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$projectDirectory = Split-Path $PSScriptRoot -Parent
$stateDirectory = Join-Path $env:USERPROFILE '.hermes-web-shell'
$baseUrl = 'http://127.0.0.1:5174'
function Invoke-PairingApi($path, $body) {
    $localKey = (Get-Content (Join-Path $stateDirectory 'local-pairing-key.txt') -Raw).Trim()
    $options = @{ Uri = "$baseUrl/auth/$path"; Headers = @{ 'X-Hermes-Local-Key' = $localKey }; TimeoutSec = 10; UseBasicParsing = $true }
    if ($null -ne $body) { $options.Method = 'POST'; $options.ContentType = 'application/json'; $options.Body = ($body | ConvertTo-Json -Compress) }
    Invoke-RestMethod @options
}
try {
    try { $null = Invoke-RestMethod "$baseUrl/auth/status" -UseBasicParsing -TimeoutSec 2 } catch {
        $nodePath = (Get-Command node -ErrorAction Stop).Source
        Start-Process -FilePath $nodePath -ArgumentList @('node_modules/vite/bin/vite.js') -WorkingDirectory $projectDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $stateDirectory 'web.log') -RedirectStandardError (Join-Path $stateDirectory 'web-error.log')
        $ready = $false
        for ($i = 0; $i -lt 40; $i++) {
            Start-Sleep -Milliseconds 250
            try { $null = Invoke-RestMethod "$baseUrl/auth/status" -UseBasicParsing -TimeoutSec 1; $ready = $true; break } catch {}
        }
        if (!$ready) { throw 'Hermes 服务未能启动，请查看 web-error.log。' }
    }
    $tunnelToken = Join-Path $stateDirectory 'tunnel-token.txt'
    $cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
    if ((Test-Path $tunnelToken) -and (Test-Path $cloudflared) -and !(Get-Process cloudflared -ErrorAction SilentlyContinue)) {
        Start-Process -FilePath $cloudflared -ArgumentList @('tunnel','run','--token-file',('"' + $tunnelToken + '"')) -WindowStyle Hidden
    }
    $form = New-Object Windows.Forms.Form
    $form.Text = 'Hermes · 连接手机'
    $form.ClientSize = New-Object Drawing.Size(420, 620)
    $form.StartPosition = 'CenterScreen'
    $form.BackColor = [Drawing.Color]::White
    $form.Font = New-Object Drawing.Font('Microsoft YaHei UI', 10)
    $form.FormBorderStyle = 'FixedDialog'
    $form.MaximizeBox = $false
    $title = New-Object Windows.Forms.Label
    $title.Text = '手机扫一扫，直接开始聊天'
    $title.SetBounds(25, 20, 375, 35)
    $form.Controls.Add($title)
    $picture = New-Object Windows.Forms.PictureBox
    $picture.SetBounds(50, 60, 320, 320)
    $picture.SizeMode = 'Zoom'
    $form.Controls.Add($picture)
    $label = New-Object Windows.Forms.Label
    $label.SetBounds(25, 390, 370, 50)
    $form.Controls.Add($label)
    $refresh = New-Object Windows.Forms.Button
    $refresh.Text = '刷新二维码'
    $refresh.SetBounds(25, 445, 175, 38)
    $form.Controls.Add($refresh)
    $devices = New-Object Windows.Forms.Button
    $devices.Text = '已连接设备'
    $devices.SetBounds(215, 445, 175, 38)
    $form.Controls.Add($devices)
    $note = New-Object Windows.Forms.Label
    $note.Text = "扫码登录保留 30 天。`n关闭此窗口后，Hermes 和隧道继续在后台运行。"
    $note.SetBounds(25, 505, 370, 90)
    $form.Controls.Add($note)
    $script:expires = 0
    function Update-QR {
        try {
            $refresh.Enabled = $false
            $result = Invoke-PairingApi 'pair' @{}
            $bytes = [Convert]::FromBase64String(($result.png -split ',')[1])
            $stream = New-Object IO.MemoryStream(,$bytes)
            $sourceImage = [Drawing.Image]::FromStream($stream)
            $oldImage = $picture.Image
            $picture.Image = New-Object Drawing.Bitmap($sourceImage)
            $sourceImage.Dispose(); $stream.Dispose()
            if ($oldImage) { $oldImage.Dispose() }
            $script:expires = $result.expires
            Set-Content (Join-Path $stateDirectory 'pairing-window-status.txt') 'QR ready'
            $label.Text = '二维码 5 分钟有效，仅可使用一次。'
        } catch { $label.Text = '生成失败，请重试。'; [Windows.Forms.MessageBox]::Show($_.Exception.Message, '连接手机') | Out-Null }
        finally { $refresh.Enabled = $true }
    }
    $refresh.Add_Click({ Update-QR })
    $devices.Add_Click({
        try {
            $dialog = New-Object Windows.Forms.Form
            $dialog.Text = '已连接设备'
            $dialog.ClientSize = New-Object Drawing.Size(380, 320)
            $dialog.StartPosition = 'CenterParent'
            $list = New-Object Windows.Forms.ListBox
            $list.SetBounds(15, 15, 350, 235)
            $dialog.Controls.Add($list)
            $items = @( (Invoke-PairingApi 'devices' $null).sessions )
            foreach ($device in $items) { $null = $list.Items.Add($device.name + ' · ' + [DateTimeOffset]::FromUnixTimeMilliseconds($device.created).LocalDateTime.ToString('MM-dd HH:mm')) }
            $remove = New-Object Windows.Forms.Button
            $remove.Text = '取消选中设备的连接'
            $remove.SetBounds(15, 265, 350, 35)
            $dialog.Controls.Add($remove)
            $remove.Add_Click({
                if ($list.SelectedIndex -ge 0) {
                    try { $null = Invoke-PairingApi 'revoke' @{id=$items[$list.SelectedIndex].id}; $dialog.Close() }
                    catch { [Windows.Forms.MessageBox]::Show($_.Exception.Message) | Out-Null }
                }
            })
            $null = $dialog.ShowDialog($form)
            $dialog.Dispose()
        } catch { [Windows.Forms.MessageBox]::Show($_.Exception.Message) | Out-Null }
    })
    $timer = New-Object Windows.Forms.Timer
    $timer.Interval = 1000
    $timer.Add_Tick({
        if ($script:expires) {
            $seconds = [Math]::Max(0, [Math]::Ceiling(($script:expires - [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()) / 1000))
            $label.Text = "二维码剩余 $seconds 秒；仅可使用一次。"
            if (!$seconds) { $picture.Image = $null; $label.Text = '二维码已过期，请点击刷新。' }
        }
    })
    $form.Add_Shown({ Update-QR; $timer.Start() })
    $null = $form.ShowDialog()
    $timer.Dispose()
    if ($picture.Image) { $picture.Image.Dispose() }
    $form.Dispose()
} catch { [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Hermes 启动失败') | Out-Null; exit 1 }

