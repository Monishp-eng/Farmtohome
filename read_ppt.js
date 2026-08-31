const fs = require('fs');
const { execSync } = require('child_process');

const psScript = `
[Reflection.Assembly]::LoadWithPartialName("System.IO.Compression.FileSystem") | Out-Null
$zip = [System.IO.Compression.ZipFile]::OpenRead("SIH2026_IDEA_Presentation_rough.pptx")
$slides = $zip.Entries | Where-Object { $_.FullName -like "ppt/slides/slide*.xml" }
foreach ($s in $slides) {
    Write-Host "=== $($s.FullName) ==="
    $sr = New-Object System.IO.StreamReader($s.Open())
    $xml = $sr.ReadToEnd()
    $sr.Close()
    $text = ([regex]::Matches($xml, '<a:t[^>]*>(.*?)</a:t>') | ForEach-Object { $_.Groups[1].Value }) -join " "
    Write-Host $text
    Write-Host ""
}
$zip.Dispose()
`;

fs.writeFileSync('read_ppt.ps1', psScript);
const output = execSync('powershell -ExecutionPolicy Bypass -File read_ppt.ps1', { encoding: 'utf-8' });
console.log(output);
fs.unlinkSync('read_ppt.ps1');
