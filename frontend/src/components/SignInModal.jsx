import { useState, useEffect } from 'react';

const API_URL = "https://airlineproj.runasp.net";

export default function SignInModal({ show, onHide }) {
  const [view, setView] = useState('login'); 

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [formError, setFormError] = useState('');
  const [formNotice, setFormNotice] = useState('');

  // Send login / signup to the backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormNotice('');
    if (view === 'login') {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const text = await res.text();
      if (!res.ok) { setFormError(text || 'Login failed'); return; }
      const data = JSON.parse(text);
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('role', data.role);
      sessionStorage.setItem('email', data.email);
      onHide();
    } else {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, passengerId: 1 }),
      });
      const text = await res.text();
      if (!res.ok) { setFormError(text || 'Sign up failed'); return; }
      setFormNotice('Account created. Now log in.');
      setView('login');
    }
  };

  useEffect(() => {
    if (!show) {
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setFormError('');
      setFormNotice('');
    }
  }, [show]);

  if (!show) return null;

  // Handle Full Name typing (Only letters and spaces allowed)
  const handleFullNameChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(value)) {
      setFullName(value);
    }
  };

  // Handle Email typing (Only letters, numbers, @, and . allowed)
  const handleEmailChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9@.]*$/.test(value)) {
      setEmail(value);
    }
  };

  // Handle Phone typing (Only numbers allowed)
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setPhone(value);
    }
  };

  // Email Validation (Basic check for @ and .)
  const isEmailValid = email.includes('@') && email.includes('.');

  // Password Validation Logic
  const isLengthValid = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = isLengthValid && hasUppercase && hasSymbol;

  // Helper to render the green checkmark or gray dot
  const ValidationIndicator = ({ isValid, text }) => (
    <div className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${isValid ? 'text-green-600' : 'text-gray-400'}`}>
      {isValid ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
        </svg>
      ) : (
        <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300" />
      )}
      <span>{text}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      
      {/* Modal Box */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[420px] p-7 relative animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button onClick={onHide} className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 text-3xl leading-none transition-colors">&times;</button>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          {view === 'login' ? 'Welcome Back' : 'Create an Account'}
        </h3>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          
          {/* SIGN UP SPECIFIC FIELDS */}
          {view === 'signup' && (
            <>
              {/* Full Name */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  value={fullName}
                  onChange={handleFullNameChange}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl pl-11 pr-4 py-3 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400" 
                />
              </div>

              {/* Phone Number */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                </div>
                <input 
                  type="tel" 
                  placeholder="Phone Number" 
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl pl-11 pr-4 py-3 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400" 
                />
              </div>
            </>
          )}

          {/* SHARED FIELDS */}
          
          {/* Email (now shared by both login and signup) */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
            </div>
            <input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={handleEmailChange}
              className={`w-full bg-gray-50 border text-gray-900 font-medium rounded-2xl pl-11 pr-12 py-3 outline-none transition-all placeholder-gray-400 ${
                view === 'signup' && isEmailValid 
                  ? 'border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-green-50/30' 
                  : 'border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
              }`}
            />
            {/* Checkmark for valid email (signup only) */}
            {view === 'signup' && isEmailValid && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-green-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
            )}
          </div>

          {/* Password */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
            </div>
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full bg-gray-50 border text-gray-900 font-medium rounded-2xl pl-11 pr-4 py-3 outline-none transition-all placeholder-gray-400 ${
                view === 'signup' && isPasswordValid ? 'border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-green-50/30' : 'border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
              }`}
            />
          </div>

          {/* Password Strength Indicators */}
          {view === 'signup' && password.length > 0 && (
            <div className="flex flex-col gap-1 px-2 mt-0.5 mb-1">
              <ValidationIndicator isValid={isLengthValid} text="At least 8 characters long" />
              <ValidationIndicator isValid={hasUppercase} text="Contains an uppercase letter" />
              <ValidationIndicator isValid={hasSymbol} text="Contains a symbol (e.g., !@#$%)" />
            </div>
          )}

          {/* Remember Me & Forgot Password */}
          {view === 'login' && (
            <div className="flex justify-between items-center mt-1 px-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500 font-medium">
                <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" />
                Remember me
              </label>
              <a href="#" className="text-sm text-blue-600 font-semibold hover:underline">Forgot Password?</a>
            </div>
          )}

          {formError && (
            <p className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-2xl px-4 py-3 text-sm text-center">{formError}</p>
          )}
          {formNotice && (
            <p className="bg-green-50 border border-green-200 text-green-800 font-semibold rounded-2xl px-4 py-3 text-sm text-center">{formNotice}</p>
          )}

          {/* Submit Button */}
          <button className={`w-full font-bold py-3 rounded-2xl mt-1 transition-all shadow-md hover:shadow-lg ${
            view === 'signup' && (!isPasswordValid || !isEmailValid)
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-[#0066ff] hover:bg-blue-700 text-white'
          }`}>
            {view === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        {/* Toggle View Link */}
        <p className="text-center text-sm text-gray-600 mt-5 font-medium">
          {view === 'login' ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => { setView('signup'); setFormError(''); setFormNotice(''); }} className="text-blue-600 hover:underline font-semibold">Sign up</button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => { setView('login'); setFormError(''); setFormNotice(''); }} className="text-blue-600 hover:underline font-semibold">Log In</button>
            </>
          )}
        </p>
        
      </div>
    </div>
  );
}