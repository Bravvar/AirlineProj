import LoginInput from './LoginInput.jsx';
import PasswordInput from './PasswordInput.jsx';
import SubmitButton from './SubmitButton.jsx';

export default function LoginPage () {
    return (
        <div className = "container-fluid vh-100 d-flex justify-content-center align-items-center bg-light">
            <div className = "p-5 bg-white shadow rounded">
                <h2 className = "d-flex justify-content-center mb-5">Login</h2>
                <div>
                    <LoginInput />
                    <PasswordInput />
                </div>
                <div className = "d-flex justify-content-center mt-3"> <SubmitButton /></div>
            </div>
        </div>
    );
}
