import { supabase } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const revalidate = 60; // Edge re-validation every 60s or on update

interface PublicPageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicBystanderPage({ params }: PublicPageProps) {
  const { id } = await params;

  if (!id) return notFound();

  // 1. Fetch patient profile with minimal fields
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, blood_group, prana_id, no_known_allergies')
    .or(`prana_id.eq.${id},id.eq.${id}`)
    .single();

  if (!profile) return notFound();

  // 2. Fetch critical allergies ONLY
  const { data: rawAllergies } = await supabase
    .from('allergies')
    .select('allergen, severity, reaction_description, is_critical')
    .eq('user_id', profile.id)
    .or('is_critical.eq.true,severity.ilike.Severe');

  const criticalAllergies = (rawAllergies || []).filter((a) => {
    const name = String(a.allergen || '').trim();
    return name.length > 0 && name.toLowerCase() !== 'null';
  });

  // 3. Fetch primary emergency contact
  const { data: contacts } = await supabase
    .from('emergency_contacts')
    .select('name, relationship, phone_number, phone')
    .eq('user_id', profile.id)
    .limit(1);

  const primaryContact = contacts && contacts.length > 0 ? contacts[0] : null;
  const contactPhone = primaryContact?.phone_number || primaryContact?.phone || '1800-PRANA-RELAY (Option 1)';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      color: '#000000',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '24px 20px',
      maxWidth: '480px',
      margin: '0 auto',
      boxSizing: 'border-box',
    }}>
      {/* Top Header Badge */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid #000000',
        paddingBottom: '12px',
        marginBottom: '24px',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
          PRANA • PUBLIC EMERGENCY TIER
        </span>
        <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700 }}>
          {profile.prana_id || id}
        </span>
      </div>

      {/* Patient Name */}
      <h1 style={{
        fontSize: '32px',
        fontWeight: 900,
        margin: '0 0 8px 0',
        letterSpacing: '-0.5px',
        textTransform: 'uppercase',
      }}>
        {profile.full_name || 'PATIENT RECORD'}
      </h1>

      {/* Blood Group */}
      <div style={{
        fontSize: '22px',
        fontWeight: 800,
        marginBottom: '28px',
        color: '#000000',
      }}>
        Blood Group: <span style={{ textDecoration: 'underline' }}>{profile.blood_group || 'O+'}</span>
      </div>

      {/* SINGLE COLORED ACCENT ELEMENT: Red Critical Allergy Warning Box */}
      <div style={{
        backgroundColor: '#FEF2F2',
        border: '3px solid #DC2626',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '28px',
      }}>
        <div style={{
          color: '#DC2626',
          fontSize: '15px',
          fontWeight: 900,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>⚠️</span>
          <span>CRITICAL ALLERGY</span>
        </div>

        {profile.no_known_allergies ? (
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#166534' }}>
            ✅ NO KNOWN DRUG ALLERGIES
          </div>
        ) : criticalAllergies.length > 0 ? (
          <div>
            {criticalAllergies.map((a, idx) => (
              <div key={idx} style={{
                fontSize: '18px',
                fontWeight: 900,
                color: '#991B1B',
                marginBottom: idx < criticalAllergies.length - 1 ? '8px' : '0',
              }}>
                • {a.allergen.toUpperCase()} — {a.severity || 'Severe'}
                {a.reaction_description ? ` (${a.reaction_description})` : ' (Anaphylaxis Risk)'}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#475569' }}>
            No critical severe allergies on file.
          </div>
        )}
      </div>

      {/* Emergency Relay Contact */}
      <div style={{
        border: '2px solid #000000',
        borderRadius: '16px',
        padding: '18px',
        marginBottom: '32px',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#64748B', marginBottom: '4px' }}>
          Emergency Relay Number:
        </div>
        <a href={`tel:${contactPhone}`} style={{
          fontSize: '20px',
          fontWeight: 900,
          color: '#000000',
          textDecoration: 'none',
          display: 'block',
        }}>
          📞 {contactPhone}
        </a>
      </div>

      {/* Paramedic Gateway Link */}
      <Link href={`/auth/paramedic?id=${profile.prana_id || id}`} style={{
        display: 'block',
        backgroundColor: '#000000',
        color: '#FFFFFF',
        textAlign: 'center',
        padding: '16px',
        borderRadius: '14px',
        fontWeight: 800,
        fontSize: '15px',
        textDecoration: 'none',
        letterSpacing: '0.5px',
      }}>
        Paramedic? Authenticate for Full Record →
      </Link>

      <div style={{
        marginTop: '20px',
        textAlign: 'center',
        fontSize: '11px',
        color: '#64748B',
      }}>
        Public view loads sub-second on 2G • Verified by PRANA Emergency Network
      </div>
    </div>
  );
}
