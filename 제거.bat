@echo off
chcp 65001 >nul
set "SAIN_REMOVE_FILE=%~f0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$text=[IO.File]::ReadAllText($env:SAIN_REMOVE_FILE,[Text.Encoding]::UTF8); & ([ScriptBlock]::Create(($text -split '(?m)^# POWERSHELL_BEGIN\r?$',2)[1]))"
set "SAIN_REMOVE_RESULT=%errorlevel%"
pause
exit /b %SAIN_REMOVE_RESULT%
# POWERSHELL_BEGIN
$ErrorActionPreference='Stop'
try {
  $base=[Environment]::GetFolderPath('ApplicationData')
  $target=[IO.Path]::GetFullPath((Join-Path $base 'personal-calendar'))
  if ([IO.Path]::GetDirectoryName($target).TrimEnd('\') -ne [IO.Path]::GetFullPath($base).TrimEnd('\') -or [IO.Path]::GetFileName($target) -ne 'personal-calendar') { throw '데이터 경로 확인 실패 · 삭제 중단' }
  Write-Host '사인검 제작 달력 자동 실행 등록 · 설정 · 내부 백업 삭제 예정'
  Write-Host ('삭제 대상: '+$target)
  Write-Host '달력 완전 종료 필요(트레이 아이콘 포함) · 직접 저장한 백업 파일과 프로그램 exe는 삭제 안 함'
  if (((Read-Host '계속하려면 DELETE 입력(대소문자 무관)') -as [string]).Trim() -ne 'DELETE') { Write-Host '취소됨 · 삭제 없음'; exit 0 }
  $running=Get-CimInstance Win32_Process -Filter "Name LIKE 'SainCalendar-%-portable.exe' OR Name='personal-calendar.exe'" -ErrorAction Stop
  if ($running) { throw '달력 실행 중 · 트레이 아이콘까지 종료 후 다시 실행 필요' }
  $run='HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
  $approved='HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run'
  foreach($key in @($run,$approved)) { if(Test-Path -LiteralPath $key) { foreach($name in @('Gersang.SainCalendar','personal-calendar')) { if((Get-Item -LiteralPath $key).GetValueNames() -contains $name) { Remove-ItemProperty -LiteralPath $key -Name $name -ErrorAction Stop } } } }
  $legacy=Join-Path $base 'Microsoft\Windows\Start Menu\Programs\Startup\개인달력.lnk'
  if(Test-Path -LiteralPath $legacy) { $shell=New-Object -ComObject WScript.Shell; $link=$shell.CreateShortcut($legacy); $expected=Join-Path (Split-Path -Parent $env:SAIN_REMOVE_FILE) 'run-hidden.vbs'; if([IO.Path]::GetFullPath($link.TargetPath) -eq [IO.Path]::GetFullPath($expected)) { Remove-Item -LiteralPath $legacy } }
  if(Test-Path -LiteralPath $target) {
    $items=@(Get-Item -LiteralPath $target)+@(Get-ChildItem -LiteralPath $target -Recurse -Force)
    if($items | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }) { throw '데이터 폴더에 연결 경로 있음 · 자동 삭제 중단 · %APPDATA%\personal-calendar 폴더 직접 삭제 필요' }
    Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction Stop
  }
  Write-Host '제거 완료 · 프로그램 폴더(exe · 제거.bat · 사용설명서) 삭제 가능'
  exit 0
} catch { Write-Host ('제거 실패: '+$_.Exception.Message) -ForegroundColor Red; exit 1 }
