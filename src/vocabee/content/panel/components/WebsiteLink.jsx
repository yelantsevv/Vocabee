import styles from './WebsiteLink.module.css';

export function WebsiteLink({ href }) {
  if (!href) return null;
  return (
    <a className={styles.websiteLink} href={href} target="_blank" rel="noreferrer">
      Открыть сайт
    </a>
  );
}
