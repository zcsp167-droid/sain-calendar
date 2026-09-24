Set WshShell = CreateObject("WScript.Shell")
scriptDir = Left(WScript.ScriptFullName, Len(WScript.ScriptFullName) - Len(WScript.ScriptName))
WshShell.Run """" & scriptDir & "start-app.bat""", 0, False
