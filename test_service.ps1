
$lines = [System.IO.File]::ReadAllLines('C:\Users\RODDY NGUEYEP\Desktop\NovaPaid\app\lib\db\service.ts')
$testPath = 'C:\Users\RODDY NGUEYEP\Desktop\NovaPaid\service_test_tmp.ts'

# Write first 1000 lines
$first1000 = $lines[0..999] -join [System.Environment]::NewLine
[System.IO.File]::WriteAllText($testPath, $first1000 + [System.Environment]::NewLine + 'export {};')
$result1 = & node --experimental-strip-types $testPath 2>&1
Write-Host "Lines 1-1000: $(if ($result1) { $result1 } else { 'OK' })"

# Write first 1500 lines
$first1500 = $lines[0..1499] -join [System.Environment]::NewLine
[System.IO.File]::WriteAllText($testPath, $first1500 + [System.Environment]::NewLine + 'export {};')
$result2 = & node --experimental-strip-types $testPath 2>&1
Write-Host "Lines 1-1500: $(if ($result2) { $result2 } else { 'OK' })"

# Write first 1800 lines
$first1800 = $lines[0..1799] -join [System.Environment]::NewLine
[System.IO.File]::WriteAllText($testPath, $first1800 + [System.Environment]::NewLine + 'export {};')
$result3 = & node --experimental-strip-types $testPath 2>&1
Write-Host "Lines 1-1800: $(if ($result3) { $result3 } else { 'OK' })"

# Full file
$result4 = & node --experimental-strip-types 'C:\Users\RODDY NGUEYEP\Desktop\NovaPaid\app\lib\db\service.ts' 2>&1
Write-Host "Full file: $(if ($result4) { $result4 } else { 'OK' })"

Remove-Item $testPath -Force

