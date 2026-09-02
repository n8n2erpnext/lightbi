!macro NSIS_HOOK_PREUNINSTALL
  ; Updates also execute the uninstaller. Only a real user uninstall closes the installation lifecycle.
  ${If} $UpdateMode <> 1
    DetailPrint "Recording LightBI uninstall lifecycle"
    nsExec::ExecToStack /TIMEOUT=3000 '"$INSTDIR\${MAINBINARYNAME}.exe" --lightbi-uninstall-track'
    Pop $0
    Pop $1
  ${EndIf}
!macroend
