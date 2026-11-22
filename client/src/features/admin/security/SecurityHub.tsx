import { useState } from 'react';
import { Tabs } from '../../../components/ui/Tabs';
import { ChangePasswordSection } from '../settings/ChangePasswordSection';
import { WebAuthnSettings } from './WebAuthnSettings';
import { Setup2FA } from './Setup2FA';
import { ActiveSessions } from './ActiveSessions';

export function SecurityHub() {
  const [activeTab, setActiveTab] = useState('Password & Email');

  return (
    <div className="admin-page-container">
      <div className="section-head" style={{ marginBottom: 20 }}>
        <div>
          <span className="eyebrow">CMS Administration</span>
          <h1 style={{ margin: '4px 0 8px' }}>Security & Authentication Settings</h1>
          <p className="muted">Manage administrator credentials, enroll device biometrics / Face ID / Windows Hello, configure 2FA, and oversee active sessions.</p>
        </div>
      </div>

      <Tabs
        tabs={['Password & Email', 'Face Recognition & Biometrics', 'Two-Factor Authentication (2FA)', 'Active Sessions & Access']}
        active={activeTab}
        onChange={setActiveTab}
      />

      <div style={{ marginTop: 20 }}>
        {activeTab === 'Password & Email' && <ChangePasswordSection />}
        {activeTab === 'Face Recognition & Biometrics' && <WebAuthnSettings />}
        {activeTab === 'Two-Factor Authentication (2FA)' && <Setup2FA />}
        {activeTab === 'Active Sessions & Access' && <ActiveSessions />}
      </div>
    </div>
  );
}
