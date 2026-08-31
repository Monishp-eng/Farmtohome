const fs = require('fs');
const { execSync } = require('child_process');

const psScript = `
[Reflection.Assembly]::LoadWithPartialName("System.IO.Compression.FileSystem") | Out-Null
$zip = [System.IO.Compression.ZipFile]::OpenRead("SIH2026_IDEA_Presentation_rough.pptx")
1..4 | ForEach-Object {
    $name = "ppt/slides/slide$_.xml"
    $entry = $zip.Entries | Where-Object { $_.FullName -eq $name }
    if ($entry) {
        Write-Host "============================== SLIDE $_ =============================="
        $sr = New-Object System.IO.StreamReader($entry.Open())
        $xml = $sr.ReadToEnd()
        $sr.Close()
        
        $pMatches = [regex]::Matches($xml, '<a:p[^>]*>(.*?)</a:p>')
        foreach ($p in $pMatches) {
            $tMatches = [regex]::Matches($p.Value, '<a:t[^>]*>(.*?)</a:t>')
            $line = ($tMatches | ForEach-Object { $_.Groups[1].Value }) -join ''
            if ($line.Trim() -and $line.Trim().Length -gt 1) {
                Write-Host $line.Trim()
            }
        }
        Write-Host ""
    }
}
$zip.Dispose()
`;

fs.writeFileSync('read_1_4.ps1', psScript);
const output = execSync('powershell -ExecutionPolicy Bypass -File read_1_4.ps1', { encoding: 'utf-8' });
console.log(output);
fs.unlinkSync('read_1_4.ps1');
