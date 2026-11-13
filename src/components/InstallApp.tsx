import { canInstall, installApp } from '../lib/install-prompt'
import { NavigationIcon } from './NavigationIcon'

function showBrowserInstallOption() {
  window.alert('No Chrome, abra o menu ⋮ → Transmitir, salvar e compartilhar → Instalar página como app. Se o Controle de estoque já estiver instalado, abra pelo ícone do aplicativo.')
}

export function InstallApp() {
  function requestInstall() {
    if (!canInstall()) {
      showBrowserInstallOption()
      return
    }
    void installApp().catch(showBrowserInstallOption)
  }

  return <button type="button" className="ui-button" onClick={requestInstall}>
    <NavigationIcon name="download" />
    Instalar aplicativo
  </button>
}
