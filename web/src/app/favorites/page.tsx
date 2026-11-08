import Link from "next/link";
import styles from "../page.module.css";
import { ManageFavorites } from "./manage-favorites";

export default function FavoritesPage() {
  return (
    <main className={styles.main}>
      <h1>My favorites</h1>
      <p>
        <Link href="/">Back to today&apos;s menus</Link>
      </p>
      <p>A favorite matches the dish by name at any station or hall. Saved on this device only.</p>
      <ManageFavorites />
    </main>
  );
}
