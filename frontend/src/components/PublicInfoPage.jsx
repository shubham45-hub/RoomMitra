import SiteFooter from "./SiteFooter";

const PAGE_CONTENT = {
  about: {
    eyebrow: "A BETTER WAY TO FIND A FLATMATE",
    title: "About RoomMitra",
    sections: [
      ["Our purpose", "RoomMitra helps people in India discover rooms and shared flats, and helps listers connect with prospective flatmates. Listings include practical details such as rent, deposit, furnishing, availability, and photos."],
      ["How it works", "Sign in with a verified mobile number, complete your profile, and browse listings in your preferred city. If a place looks suitable, contact the lister through the options shown on that listing. Listers are responsible for keeping their information current."],
      ["Use good judgement", "RoomMitra helps people find each other; it does not inspect or certify properties, verify every listing detail, negotiate a tenancy, or guarantee a safe or successful transaction. Visit and assess a property, confirm costs and terms directly, and do not send money before you have independently checked the offer."],
      ["Trust and safety", "Use the listing report option to flag suspicious, inaccurate, duplicate, inappropriate, or potentially infringing content. Reports are sent to the RoomMitra moderation queue for review."],
    ],
  },
  privacy: {
    eyebrow: "YOUR INFORMATION",
    title: "Privacy notice",
    sections: [
      ["Information RoomMitra handles", "The service uses your mobile number to send and verify sign-in codes. Your profile can include your name, email, preferred city, sex, religion, state of origin, and profile photo. If you post a listing, RoomMitra stores its details and uploaded property photos. If you contact a lister, your message is stored and your verified phone number is shared only after you choose the phone-sharing option."],
      ["How information is used", "Information is used to authenticate your account, show your profile and listings, match and filter listings, deliver enquiries, provide account features, prevent abuse, and review reports. Listing details and photos are visible to other eligible RoomMitra users. Contact details may be visible as described in the contact action you choose."],
      ["Service providers and storage", "RoomMitra relies on hosting, database, file-storage, and SMS delivery providers to operate. The SMS provider configured for production may process your phone number and one-time code to deliver login messages. Production operators should identify their actual providers and hosting locations here before launch."],
      ["Your choices and account deletion", "You can update profile information and request account deletion from My profile. The app's deletion feature is intended to remove your account and associated listings, enquiries, and uploaded photos. Some records may need to be retained where required for security, dispute handling, or law; the operator should publish applicable retention periods before launch."],
      ["Security and contact", "RoomMitra uses account and access controls, but no internet service can promise absolute security. For privacy requests, include the operator's verified support contact before publishing this notice. Do not put private information in listing descriptions or photos."],
    ],
  },
  terms: {
    eyebrow: "USING ROOMMITRA",
    title: "Terms of use",
    sections: [
      ["The service", "RoomMitra is a platform for discovering room and flatmate listings and connecting users. RoomMitra is not a real-estate broker, landlord, tenant, property manager, or party to agreements made between users."],
      ["Your account", "Use a mobile number you control, keep your sign-in codes private, and provide profile information that is accurate and current. You are responsible for activity performed through your account and should report suspected unauthorised access."],
      ["Listings and uploaded content", "You must have the rights and permissions needed to post text, photographs, and other material. Keep prices, availability, occupancy, location, and other details accurate. Do not post fraudulent, discriminatory, unlawful, misleading, threatening, or infringing material, or another person's private information without permission."],
      ["Contact and transactions", "When you choose to contact a lister, your message and any phone-sharing choice are handled as shown in the app. Independently verify the property, identity of the person offering it, costs, and agreement before making a decision or payment. RoomMitra does not guarantee a listing, user, property, response, or transaction."],
      ["Reports and enforcement", "RoomMitra may review reported content and restrict or remove listings or accounts that violate these terms or applicable law. If you believe a listing infringes your rights, use the copyright report instructions on the Copyright & reports page."],
      ["Changes and legal review", "These draft terms need review and completion by the RoomMitra operator before public launch, including the operator's legal identity, contact details, governing law, dispute process, and effective date. The operator may update the terms and will publish the current version here."],
    ],
  },
  copyright: {
    eyebrow: "CONTENT RIGHTS & REPORTING",
    title: "Copyright & reports",
    sections: [
      ["Copyright ownership", "© 2026 RoomMitra. The RoomMitra name, branding, original interface, and original text are protected to the extent provided by applicable law. Third-party names, software, fonts, icons, and other assets remain the property of their respective owners and are used under their applicable terms or licenses."],
      ["Only upload content you may use", "Users must own or have permission to use listing photos and text they upload. Do not copy another person's listing, photograph, logo, or other protected work without permission. Uploading content does not transfer its ownership to RoomMitra."],
      ["Report a copyright concern", "Open the listing, choose Report this listing, select Copyright infringement, and include the listing title or URL, identify the work you own or represent, explain where the allegedly infringing material appears, and provide enough information for the operator to contact you. Do not include sensitive identity documents in the report. The operator should add a monitored rights-contact email and a formal notice/counter-notice process before launch."],
      ["Review and action", "Reports are delivered to the application owner's moderation queue. The operator can review the report and pause a listing while reviewing it. This in-app reporting path is an initial workflow, not a substitute for a legally reviewed notice-and-takedown policy."],
    ],
  },
};

export default function PublicInfoPage({ page, onNavigate, onBack }) {
  const content = PAGE_CONTENT[page] || PAGE_CONTENT.about;

  return (
    <main className="public-info-page">
      <header className="public-info-header">
        <a className="wordmark" href="#" onClick={(event) => { event.preventDefault(); onBack(); }}>
          <span className="wordmark-icon">R</span>
          RoomMitra
        </a>
        <button className="public-info-back" type="button" onClick={onBack}>← Back to RoomMitra</button>
      </header>

      <article className="public-info-content">
        <p className="eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p className="public-info-updated">Copyright © 2026 RoomMitra · Draft for launch review</p>
        {content.sections.map(([heading, body]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            <p>{body}</p>
          </section>
        ))}
        <p className="public-info-review-note">
          Privacy and terms must be reviewed and completed with the operator's real contact details and applicable legal requirements before public launch.
        </p>
      </article>

      <SiteFooter onNavigate={onNavigate} activePage={page} />
    </main>
  );
}
