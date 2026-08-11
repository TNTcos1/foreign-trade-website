type ContentSection = {
  heading: string | null
  paragraphs: string[]
  questions: Array<{ question: string; answer: string }>
}

function parseContentBody(body: string): ContentSection[] {
  const sections: ContentSection[] = []
  let current: ContentSection = { heading: null, paragraphs: [], questions: [] }
  let pendingQuestion: string | null = null

  function commit(): void {
    if (current.heading || current.paragraphs.length > 0 || current.questions.length > 0) {
      sections.push(current)
    }
    current = { heading: null, paragraphs: [], questions: [] }
    pendingQuestion = null
  }

  for (const line of body.split(/\r?\n/)) {
    const value = line.trim()
    if (!value) {
      continue
    }
    if (value.startsWith("## ")) {
      commit()
      current.heading = value.slice(3).trim()
      continue
    }
    if (value.startsWith("### ")) {
      pendingQuestion = value.slice(4).trim()
      continue
    }
    if (pendingQuestion) {
      current.questions.push({ question: pendingQuestion, answer: value })
      pendingQuestion = null
      continue
    }
    current.paragraphs.push(value)
  }
  commit()
  return sections
}

export function ContentBody({ body }: { body: string }) {
  const sections = parseContentBody(body)

  return (
    <div className="content-sections">
      {sections.map((section, index) => (
        <section className="content-section" key={`${section.heading ?? "intro"}-${index}`}>
          <span className="content-section__index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            {section.heading ? <h2>{section.heading}</h2> : null}
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.questions.length > 0 ? (
              <dl className="content-faq">
                {section.questions.map(({ question, answer }) => (
                  <div key={question}>
                    <dt>{question}</dt>
                    <dd>{answer}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  )
}
