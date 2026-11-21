import { useMe } from '../auth/useMe';
import { ChangePassword } from '../auth/ChangePassword';
export function Profile(){const {me}=useMe();return <><h1>Profile</h1><div className="card"><h3>{me?.name}</h3><p className="muted">{me?.email}</p></div><section className="section"><h2>Security</h2><ChangePassword/></section></>}
