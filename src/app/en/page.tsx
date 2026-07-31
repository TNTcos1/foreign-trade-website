import Link from "next/link"

export default function EnglishHomePage() {
  return (
    <main>
      <h1>Stock</h1>
      <p>View currently available clothing clearance stock.</p>
      <Link href="/en/catalog">Browse the catalog</Link>
    </main>
  )
}
