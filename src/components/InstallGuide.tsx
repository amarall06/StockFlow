import { useRef } from 'react'
import { useModalDialog } from '../lib/use-modal-dialog'
import './InstallGuide.css'

export function InstallGuide({ available, error, onInstall, onClose }: { available: boolean; error: string; onInstall: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useModalDialog(ref)
  return <dialog ref={ref} className="install-guide-dialog" aria-labelledby="install-guide-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <header><h2 id="install-guide-title">Instalar o LIBER</h2><button type="button" autoFocus onClick={onClose}>Fechar instruções</button></header>
    <p>Abra o LIBER conectado à internet neste aparelho. A instalação cria um ícone para abrir o sistema em janela própria. Os nomes das opções podem variar conforme a versão do navegador.</p>
    {available && <button type="button" onClick={onInstall}>Instalar aplicativo</button>}
    {error && <p role="alert">{error}</p>}
    <section aria-labelledby="install-windows-title"><h3 id="install-windows-title">Windows — Chrome ou Edge</h3>
      <p>No Chrome, procure a opção de instalação na barra de endereço ou no menu de compartilhar/salvar. No Edge, abra o menu do navegador e procure Aplicativos, nas ferramentas, para instalar este site.</p>
      <p>Confirme a instalação no navegador e abra o LIBER pelo ícone criado.</p>
      <p><a href="https://support.google.com/chrome/answer/9658361?hl=pt-BR&amp;co=GENIE.Platform%3DDesktop" target="_blank" rel="noopener noreferrer">Ajuda oficial do Chrome (nova aba)</a> · <a href="https://support.microsoft.com/en-us/edge/install-manage-or-uninstall-apps-in-microsoft-edge" target="_blank" rel="noopener noreferrer">Ajuda oficial do Edge (nova aba)</a></p>
    </section>
    <section aria-labelledby="install-android-title"><h3 id="install-android-title">Android — Chrome</h3>
      <p>No menu do Chrome, procure a opção de instalar ou criar um atalho e escolha instalar. Confirme no navegador e procure o ícone LIBER na tela inicial ou na lista de aplicativos.</p>
      <a href="https://support.google.com/chrome/answer/9658361?hl=pt-BR&amp;co=GENIE.Platform%3DAndroid" target="_blank" rel="noopener noreferrer">Ajuda oficial do Chrome no Android (nova aba)</a>
    </section>
    <section aria-labelledby="install-iphone-title"><h3 id="install-iphone-title">iPhone — Safari</h3>
      <p>No Safari, abra o menu de compartilhamento e escolha Adicionar à Tela de Início. Se aparecer Abrir como App da Web, mantenha a opção ativada. Confirme e abra o ícone LIBER.</p>
      <p>Se a ação não estiver na lista de compartilhamento, procure Editar Ações para acrescentá-la.</p>
      <a href="https://support.apple.com/pt-br/guide/iphone/iphea86e5236/ios" target="_blank" rel="noopener noreferrer">Ajuda oficial da Apple (nova aba)</a>
    </section>
    <section aria-labelledby="install-offline-title"><h3 id="install-offline-title">Primeiro uso e funcionamento offline</h3>
      <p>Entre com sua conta e consulte o estoque conectado antes de precisar usar sem internet. A cópia offline da consulta vale por até 15 minutos; rascunhos não confirmam alterações no estoque e precisam de conferência e envio conectado.</p>
      <p>Instalar o aplicativo não transfere rascunhos locais entre aparelhos. Antes de limpar dados ou desinstalar, confira as pendências guardadas neste aparelho.</p>
      <p>Para receber uma nova versão, conclua as operações em andamento, feche as janelas e abas do LIBER e reabra conectado. O navegador controla a atualização.</p>
    </section>
  </dialog>
}
