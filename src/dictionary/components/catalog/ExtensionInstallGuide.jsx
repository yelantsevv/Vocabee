import { useState } from 'react';
import styles from './ExtensionInstallGuide.module.css';

const CHROME_EXTENSIONS_URL = 'chrome://extensions/';

export function ExtensionInstallGuide({ error }) {
  const [copyStatus, setCopyStatus] = useState('');

  async function copyExtensionsAddress() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(CHROME_EXTENSIONS_URL);
      } else {
        const temporaryInput = document.createElement('textarea');
        temporaryInput.value = CHROME_EXTENSIONS_URL;
        temporaryInput.style.position = 'fixed';
        temporaryInput.style.opacity = '0';
        document.body.append(temporaryInput);
        temporaryInput.select();
        const copied = document.execCommand('copy');
        temporaryInput.remove();
        if (!copied) throw new Error('copy failed');
      }
      setCopyStatus('Скопировано');
    } catch {
      setCopyStatus('Не удалось скопировать');
    }
    window.setTimeout(() => setCopyStatus(''), 2200);
  }

  return (
    <section className={styles.guide} aria-labelledby="extension-guide-title">
      <header className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>Vocabee для Chrome</span>
          <h2 id="extension-guide-title">Переводите слова прямо в YouTube</h2>
          <p>Установите расширение, чтобы переводить отдельные слова и фразы в субтитрах и сохранять полезные выражения в свой словарь.</p>
        </div>
        <div className={styles.addressBlock}>
          <code
            className={styles.addressValue}
            title="Дважды щёлкните, чтобы скопировать адрес"
            onDoubleClick={copyExtensionsAddress}
          >
            {CHROME_EXTENSIONS_URL}
          </code>
          <button
            className={styles.copyButton}
            type="button"
            onClick={copyExtensionsAddress}
            aria-label={copyStatus === 'Скопировано' ? 'Адрес скопирован' : 'Скопировать адрес страницы расширений'}
            title={copyStatus || 'Скопировать адрес'}
          >
            {copyStatus === 'Скопировано' ? (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
            )}
            <span className={styles.srOnly} aria-live="polite">{copyStatus}</span>
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.install}>
          <h3><span className={styles.sectionIcon}>↗</span> Установка</h3>
          <ol className={styles.steps}>
            <li><span>Подготовьте расширение</span><small>Скачайте и распакуйте проект Vocabee или его собранную версию. Для установки нужна папка расширения с файлом <code>manifest.json</code>. Если собираете исходники самостоятельно, в корне проекта выполните <code>npm install</code> и <code>npm run build:app</code>.</small></li>
            <li><span>Включите режим разработчика</span><small>На странице расширений Chrome переключите «Режим разработчика» в правом верхнем углу.</small></li>
            <li><span>Загрузите распакованное расширение</span><small>Нажмите эту кнопку на странице и выберите подготовленную папку, где находится <code>manifest.json</code>.</small></li>
            <li><span>Начните пользоваться</span><small>Откройте или обновите YouTube. Нажмите значок Vocabee в панели Chrome, чтобы включать и выключать перевод.</small></li>
          </ol>
          <p className={styles.hint}>Скопируйте адрес выше и вставьте его в адресную строку Chrome.</p>
          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>

        <div className={styles.capabilities}>
          <h3><span className={styles.sectionIcon}>✦</span> Возможности</h3>
          <ul className={styles.features}>
            <li><span className={styles.featureIcon}>Aa</span><span><strong>Перевод слов и фраз</strong><small>Выделите слово или фрагмент текста в субтитрах YouTube, чтобы увидеть перевод.</small></span></li>
            <li><span className={styles.featureIcon}>♫</span><span><strong>Озвучивание и сохранение</strong><small>Прослушайте перевод и нажмите звезду, чтобы добавить его в «Мой словарь».</small></span></li>
            <li><span className={styles.featureIcon}>☷</span><span><strong>Словарь и настройки</strong><small>В плавающей панели доступны сохранённые выражения, переключатель перевода, тема и размер текста.</small></span></li>
            <li><span className={styles.featureIcon}>Ⅱ</span><span><strong>Удобный просмотр</strong><small>Видео приостанавливается, пока указатель находится над субтитром или подсказкой.</small></span></li>
          </ul>
          <p className={styles.note}>Расширение работает на YouTube в настольном Chrome. Сохранённые слова также доступны в разделе «Мой словарь» этого приложения.</p>
        </div>
      </div>
    </section>
  );
}
