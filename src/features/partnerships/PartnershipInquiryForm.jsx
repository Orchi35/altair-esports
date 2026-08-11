import { useEffect, useMemo, useRef, useState } from "react";
import { SITE_LINKS } from "../../config/site.js";
import { createPartnershipFormTracker, trackSocialOpen } from "../../services/analytics/actions.js";
import { PARTNERSHIP_FORM_LIMITS, validatePartnershipInquiry } from "./partnershipFormSchema.js";

const ENDPOINT = "/api/partnership-inquiry";
const INITIAL_FORM = Object.freeze({
  brand:"",
  contact:"",
  email:"",
  phone:"",
  area:"",
  campaignDate:"",
  budget:"",
  message:"",
  privacyAccepted:false,
  website:"",
});

function FieldError({ copy, errors, name }) {
  const code = errors[name];
  if (!code) return null;
  return <span className="partnership-field-error" id={`partnership-${name}-error`}>{copy.errors[code] || copy.errors.required}</span>;
}

function fieldA11y(errors, name) {
  return errors[name] ? { "aria-invalid":"true", "aria-describedby":`partnership-${name}-error` } : {};
}

export function PartnershipInquiryForm({ areas, copy, locale }) {
  const [availability, setAvailability] = useState("checking");
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submission, setSubmission] = useState("idle");
  const firstFieldRef = useRef(null);
  const analytics = useMemo(() => createPartnershipFormTracker(locale), [locale]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(ENDPOINT, { method:"GET", cache:"no-store", headers:{ accept:"application/json" }, signal:controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        setAvailability(response.ok && payload?.data?.configured === true ? "configured" : "unconfigured");
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setAvailability("unconfigured");
      });
    return () => controller.abort();
  }, []);

  const update = (event) => {
    analytics.start();
    const { name, type, value, checked } = event.target;
    setForm((current) => ({ ...current, [name]:type === "checkbox" ? checked : value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    if (submission !== "idle") setSubmission("idle");
  };

  const submit = async (event) => {
    event.preventDefault();
    analytics.start();
    const formElement = event.currentTarget;
    if (availability !== "configured" || submission === "sending") return;
    const validation = validatePartnershipInquiry(form);
    if (!validation.valid) {
      analytics.validationError("client-validation");
      setErrors(validation.errors);
      setSubmission("validation");
      const firstErrorName = Object.keys(validation.errors).find((name) => name !== "website");
      formElement.elements.namedItem(firstErrorName)?.focus();
      return;
    }

    setErrors({});
    setSubmission("sending");
    analytics.submit(validation.data.area);
    try {
      const response = await fetch(ENDPOINT, {
        method:"POST",
        headers:{ "content-type":"application/json", accept:"application/json" },
        body:JSON.stringify(validation.data),
      });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.ok === true && payload?.status === "sent") {
        analytics.success(validation.data.area);
        setForm(INITIAL_FORM);
        setSubmission("sent");
        firstFieldRef.current?.focus();
        return;
      }
      if (response.status === 422 && payload?.errors) {
        analytics.validationError("server-validation");
        setErrors(payload.errors);
        setSubmission("validation");
        const firstErrorName = Object.keys(payload.errors).find((name) => name !== "website");
        formElement.elements.namedItem(firstErrorName)?.focus();
      } else if (response.status === 429) {
        analytics.error("rate-limit");
        setSubmission("rate-limit");
      }
      else if (response.status === 503 && payload?.code === "NOT_CONFIGURED") {
        analytics.error("unconfigured");
        setAvailability("unconfigured");
        setSubmission("unconfigured");
      } else {
        analytics.error("server");
        setSubmission("server-error");
      }
    } catch {
      analytics.error("network");
      setSubmission("server-error");
    }
  };

  const disabled = availability !== "configured" || submission === "sending";
  const announcement = availability === "checking"
    ? copy.checking
    : availability === "unconfigured"
      ? copy.configuring
      : submission === "sent" ? copy.sent
        : submission === "validation" ? copy.validation
          : submission === "rate-limit" ? copy.rateLimit
            : submission === "server-error" ? copy.serverError
              : "";

  return (
    <div className="partnership-form-layout">
      <div className="partnership-form-intro">
        <span className="partnership-kicker">{copy.eyebrow}</span>
        <h2 id="partnership-form-title">{copy.title}</h2>
        <p>{copy.intro}</p>
        <a href={SITE_LINKS.instagram} target="_blank" rel="noopener noreferrer" onClick={() => trackSocialOpen("instagram", locale)}>Instagram</a>
      </div>

      <form className="partnership-form" noValidate onSubmit={submit} aria-labelledby="partnership-form-title">
        {announcement && (
          <div className={`partnership-form-status partnership-form-status--${availability === "unconfigured" || submission === "server-error" || submission === "rate-limit" ? "warning" : submission}`} role={submission === "server-error" ? "alert" : "status"} aria-live="polite">
            {announcement}
          </div>
        )}
        <fieldset disabled={disabled} aria-disabled={disabled}>
          <legend className="sr-only">{copy.title}</legend>
          <div className="partnership-form-grid">
            <label>
              <span>{copy.fields.brand}</span>
              <input ref={firstFieldRef} name="brand" value={form.brand} onChange={update} autoComplete="organization" placeholder={copy.placeholders.brand} maxLength={PARTNERSHIP_FORM_LIMITS.brand} required {...fieldA11y(errors, "brand")}/>
              <FieldError copy={copy} errors={errors} name="brand"/>
            </label>
            <label>
              <span>{copy.fields.contact}</span>
              <input name="contact" value={form.contact} onChange={update} autoComplete="name" placeholder={copy.placeholders.contact} maxLength={PARTNERSHIP_FORM_LIMITS.contact} required {...fieldA11y(errors, "contact")}/>
              <FieldError copy={copy} errors={errors} name="contact"/>
            </label>
            <label>
              <span>{copy.fields.email}</span>
              <input name="email" type="email" inputMode="email" value={form.email} onChange={update} autoComplete="email" placeholder={copy.placeholders.email} maxLength={PARTNERSHIP_FORM_LIMITS.email} required {...fieldA11y(errors, "email")}/>
              <FieldError copy={copy} errors={errors} name="email"/>
            </label>
            <label>
              <span>{copy.fields.phone} <small>{copy.fields.optional}</small></span>
              <input name="phone" type="tel" inputMode="tel" value={form.phone} onChange={update} autoComplete="tel" placeholder={copy.placeholders.phone} maxLength={PARTNERSHIP_FORM_LIMITS.phone} {...fieldA11y(errors, "phone")}/>
              <FieldError copy={copy} errors={errors} name="phone"/>
            </label>
            <label>
              <span>{copy.fields.area}</span>
              <select name="area" value={form.area} onChange={update} required {...fieldA11y(errors, "area")}>
                <option value="">{copy.select}</option>
                {areas.map((area) => <option key={area.key} value={area.key}>{area.title}</option>)}
              </select>
              <FieldError copy={copy} errors={errors} name="area"/>
            </label>
            <label>
              <span>{copy.fields.campaignDate} <small>{copy.fields.optional}</small></span>
              <input name="campaignDate" type="date" value={form.campaignDate} onChange={update} {...fieldA11y(errors, "campaignDate")}/>
              <FieldError copy={copy} errors={errors} name="campaignDate"/>
            </label>
            <label className="partnership-form-wide">
              <span>{copy.fields.budget} <small>{copy.fields.optional}</small></span>
              <select name="budget" value={form.budget} onChange={update} {...fieldA11y(errors, "budget")}>
                <option value="">{copy.select}</option>
                {copy.budgets.map((budget) => <option key={budget.value} value={budget.value}>{budget.label}</option>)}
              </select>
              <FieldError copy={copy} errors={errors} name="budget"/>
            </label>
            <label className="partnership-form-wide">
              <span>{copy.fields.message}</span>
              <textarea name="message" value={form.message} onChange={update} placeholder={copy.placeholders.message} rows="7" maxLength={PARTNERSHIP_FORM_LIMITS.message} required {...fieldA11y(errors, "message")}/>
              <span className="partnership-character-count" aria-hidden="true">{form.message.length}/{PARTNERSHIP_FORM_LIMITS.message}</span>
              <FieldError copy={copy} errors={errors} name="message"/>
            </label>
          </div>

          <label className="partnership-honeypot" aria-hidden="true">
            Website
            <input name="website" value={form.website} onChange={update} tabIndex="-1" autoComplete="off" maxLength={PARTNERSHIP_FORM_LIMITS.website}/>
          </label>

          <label className="partnership-privacy">
            <input name="privacyAccepted" type="checkbox" checked={form.privacyAccepted} onChange={update} required {...fieldA11y(errors, "privacyAccepted")}/>
            <span>{copy.fields.privacy} <a href={SITE_LINKS.privacy} target="_blank" rel="noopener noreferrer">{copy.privacyLink}</a></span>
          </label>
          <FieldError copy={copy} errors={errors} name="privacyAccepted"/>

          <button className="partnership-submit" type="submit" disabled={disabled}>
            {submission === "sending" ? copy.sending : copy.submit}
          </button>
        </fieldset>
      </form>
    </div>
  );
}
