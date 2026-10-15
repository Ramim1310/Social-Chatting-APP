import AuthScreen from '../../components/common/AuthScreen';
export default function Login({ onLogin, onSwitchToSignup }) { return <AuthScreen onLogin={onLogin} onSwitch={onSwitchToSignup} />; }
