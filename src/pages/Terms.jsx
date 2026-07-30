import { SUPPORT_EMAIL } from '../data/contact.js'

export default function Terms() {
  return (
    <section className="doc">
      <div className="container doc__inner">
        <h1 className="doc__title">Terms &amp; Conditions</h1>

        <h2 className="doc__heading">1. Acceptance of Terms</h2>
        <p className="doc__body">
          Using ModGuard means you agree to these terms. If you don't agree,
          you shouldn't use the software.
        </p>

        <h2 className="doc__heading">2. What ModGuard Does</h2>
        <p className="doc__body">
          ModGuard is a detection tool that scans third-party mod files and,
          in some cases, monitors activity while a game is actively running,
          for signs of malware, suspicious behavior, or known malicious
          patterns. ModGuard does not guarantee that a mod is completely
          safe, only that it did not detect known threat patterns at the time
          of the scan.
        </p>

        <h2 className="doc__heading">3. No Warranty / As-Is Basis</h2>
        <p className="doc__body">
          ModGuard is provided "as is" without warranties of any kind,
          express or implied. We do not guarantee that ModGuard will catch
          every threat, that it is error-free, or that it will be compatible
          with every system, mod, or game version.
        </p>

        <h2 className="doc__heading">4. Limitation of Liability</h2>
        <p className="doc__body">
          ModGuard and its creators are not liable for any damages, data
          loss, account loss, in-game losses, or system harm resulting from
          the use or inability to use ModGuard, including cases where a
          malicious mod was not detected, or where a false positive or false
          negative occurred.
        </p>

        <h2 className="doc__heading">5. User Responsibility</h2>
        <p className="doc__body">
          You're responsible for exercising your own judgment when installing
          third-party mods, regardless of ModGuard's scan results. ModGuard
          is a supplementary safety tool, not a replacement for careful,
          independent verification of mod sources.
        </p>

        <h2 className="doc__heading">6. Device and System Access</h2>
        <p className="doc__body">
          ModGuard may access certain files, processes, or system activity on
          your device in order to perform scans, including monitoring while a
          game is actively running. This access is limited to what's
          necessary to detect malicious behavior and is not used to collect
          unrelated personal data. Full details are available in our{' '}
          <a href="/privacy" className="doc__link">
            Privacy Policy
          </a>
          .
        </p>

        <h2 className="doc__heading">7. Data Collection</h2>
        <p className="doc__body">
          Scan results, such as detected threats, risk scores, and file
          metadata, may be collected to improve detection accuracy and
          maintain our threat database. This does not include personal
          files, credentials, or unrelated personal information. See our{' '}
          <a href="/privacy" className="doc__link">
            Privacy Policy
          </a>{' '}
          for full details.
        </p>

        <h2 className="doc__heading">8. Third-Party Mods and Content</h2>
        <p className="doc__body">
          ModGuard scans third-party content that we do not create, own, or
          control. We are not responsible for the content, behavior, or
          safety of any mod itself, only for the accuracy of our detection at
          the time of scanning.
        </p>

        <h2 className="doc__heading">9. Minors</h2>
        <p className="doc__body">
          If you're a minor, you should have a parent or guardian's
          permission before downloading and using ModGuard.
        </p>

        <h2 className="doc__heading">10. Changes to These Terms</h2>
        <p className="doc__body">
          These terms may be updated periodically as ModGuard evolves.
          Continued use of ModGuard after changes are posted constitutes
          acceptance of the updated terms.
        </p>

        <h2 className="doc__heading">11. Contact</h2>
        <p className="doc__body">
          Questions about these terms can be directed to{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="doc__link">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>
    </section>
  )
}
