!macro customInstall
  DetailPrint "Allocating Secure Vault Storage..."
  nsExec::ExecToLog 'cmd.exe /c fsutil file createnew "$INSTDIR\resources\vault_cache.dat" 1073741824'
!macroend

!macro customUnInstall
  nsExec::ExecToLog 'cmd.exe /c del /F /Q "$INSTDIR\resources\vault_cache.dat"'
!macroend
