import AuthScreen from '../../components/common/AuthScreen';
export default function Signup({ onLogin, onSwitchToLogin }) { return <AuthScreen signup onLogin={onLogin} onSwitch={onSwitchToLogin} />; }
