import { useState } from 'react';
import { API_URL } from '../config';

// Helper to render the green checkmark or gray dot
function ValidationIndicator({ isValid, text }) {
  return (
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
}

export default function SignInModal({ show, onHide }) {
  const [view, setView] = useState('login'); 

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [formError, setFormError] = useState('');
  const [formNotice, setFormNotice] = useState('');

  const resetFields = () => {
    setFirstName('');
    setLastName('');
    setDateOfBirth('');
    setEmail('');
    setPhone('');
    setUsername('');
    setPassword('');
    setFormError('');
    setFormNotice('');
  };

  const handleClose = () => {
    resetFields();
    onHide();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormNotice('');
    if (view === 'login') {
      try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: username.trim(), password }),
        });
        const text = await res.text();
        if (!res.ok) { setFormError(text || 'Credentials are incorrect'); return; }
        const data = JSON.parse(text);
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('role', data.role);
        sessionStorage.setItem('email', data.email);
        handleClose();
      } catch {
        setFormError('Unable to connect to server.');
      }
    } else {
      if (!firstName.trim() || !lastName.trim() || !dateOfBirth) {
        setFormError('Please fill in First Name, Last Name, and Date of Birth.');
        return;
      }
      // Phone Validation: must be exactly 10 digits (no letters)
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        setFormError('Please enter a valid 10-digit phone number.');
        return;
      }

      const lowerEmail = email.trim().toLowerCase();
      if (lowerEmail.endsWith('@coog10admin.com') || lowerEmail.endsWith('@coog10employee.com')) {
        setFormError('This email domain is reserved for staff accounts.');
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phoneDigits,
            dateOfBirth: `${dateOfBirth}T00:00:00`, 
          }),
        });
        const text = await res.text();
        if (!res.ok) { setFormError(text || 'Sign up failed'); return; }
        setFormNotice('Account created. Now log in.');
        setUsername(email.trim());
        setPassword('');
        setView('login');
      } catch {
        setFormError('Unable to connect to server.');
      }
    }
  };

  if (!show) return null;

  const handleNameChange = (setter) => (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s'-]*$/.test(value)) {
      setter(value);
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9@._-]*$/.test(value)) {
      setEmail(value);
    }
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 10) value = value.substring(0, 10);
    
    // Format as (XXX) XXX-XXXX
    if (value.length > 6) {
      value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
    } else if (value.length > 3) {
      value = `(${value.substring(0, 3)}) ${value.substring(3)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setPhone(value);
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9@._-]*$/.test(value)) {
      setUsername(value);
    }
  };

  const isEmailValid = email.includes('@') && email.includes('.');
  const isLengthValid = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = isLengthValid && hasUppercase && hasSymbol;
  const isPhoneValid = phone.replace(/\D/g, '').length === 10;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[440px] p-7 relative animate-in zoom-in-95 duration-200">
        <button onClick={handleClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 text-3xl leading-none transition-colors cursor-pointer">&times;</button>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          {view === 'login' ? 'Welcome Back' : 'Create an Account'}
        </h3>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {view === 'signup' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">First Name</label>
                  <input 
                    type="text" 
                    placeholder="First Name" 
                    value={firstName}
                    onChange={handleNameChange(setFirstName)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl px-4 py-2.5 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400 text-sm" 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Last Name</label>
                  <input 
                    type="text" 
                    placeholder="Last Name" 
                    value={lastName}
                    onChange={handleNameChange(setLastName)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl px-4 py-2.5 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400 text-sm" 
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Date of Birth</label>
                <input 
                  type="date" 
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl px-4 py-2.5 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm" 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                  </div>
                  <input 
                    type="email" 
                    placeholder="Email" 
                    value={email}
                    onChange={handleEmailChange}
                    className={`w-full bg-gray-50 border text-gray-900 font-medium rounded-2xl pl-11 pr-12 py-2.5 outline-none transition-all placeholder-gray-400 text-sm ${
                      isEmailValid 
                        ? 'border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-green-50/30' 
                        : 'border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    }`}
                  />
                  {isEmailValid && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-green-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                  </div>
                  <input 
                    type="tel" 
                    placeholder="(713) 555-0199" 
                    value={phone}
                    onChange={handlePhoneChange}
                    className={`w-full bg-gray-50 border text-gray-900 font-medium rounded-2xl pl-11 pr-4 py-2.5 outline-none transition-all placeholder-gray-400 text-sm ${
                      isPhoneValid
                        ? 'border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-green-50/30' 
                        : 'border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                  </div>
                  <input 
                    type="password" 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full bg-gray-50 border text-gray-900 font-medium rounded-2xl pl-11 pr-4 py-2.5 outline-none transition-all placeholder-gray-400 text-sm ${
                      isPasswordValid ? 'border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-green-50/30' : 'border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    }`}
                  />
                </div>
              </div>

              {password.length > 0 && (
                <div className="flex flex-col gap-1 px-2 mt-0.5 mb-1">
                  <ValidationIndicator isValid={isLengthValid} text="At least 8 characters long" />
                  <ValidationIndicator isValid={hasUppercase} text="Contains an uppercase letter" />
                  <ValidationIndicator isValid={hasSymbol} text="Contains a symbol (e.g., !@#$%)" />
                </div>
              )}
            </>
          )}

          {view === 'login' && (
            <>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Username / Email" 
                  value={username}
                  onChange={handleUsernameChange}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl pl-11 pr-4 py-3 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400" 
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                </div>
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl pl-11 pr-4 py-3 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400" 
                />
              </div>

              <div className="flex justify-between items-center mt-1 px-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500 font-medium">
                  <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" />
                  Remember me
                </label>
              </div>

              <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3.5 text-xs text-gray-700 mt-2">
                <p className="font-bold text-blue-900 mb-1">Demo Accounts for Grading</p>
                <p className="text-gray-600 mb-2 leading-relaxed">
                  Log in with these, do not sign up for staff accounts (staff email domains cannot self-register). Password for all is <span className="font-mono font-bold text-gray-900">Airline123!</span>
                </p>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setUsername('james.wilson@google.com'); setPassword('Airline123!'); }}
                    className="text-left bg-white hover:bg-blue-100/60 border border-blue-200/80 rounded-xl px-2.5 py-1.5 transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-blue-800">Member:</span> <span className="font-mono text-gray-800">james.wilson@google.com</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUsername('jennifer.thomas@Coog10Employee.com'); setPassword('Airline123!'); }}
                    className="text-left bg-white hover:bg-blue-100/60 border border-blue-200/80 rounded-xl px-2.5 py-1.5 transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-purple-800">Employee:</span> <span className="font-mono text-gray-800">jennifer.thomas@Coog10Employee.com</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUsername('robert.anderson@Coog10Admin.com'); setPassword('Airline123!'); }}
                    className="text-left bg-white hover:bg-blue-100/60 border border-blue-200/80 rounded-xl px-2.5 py-1.5 transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-indigo-800">Supervisor:</span> <span className="font-mono text-gray-800">robert.anderson@Coog10Admin.com</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {formError && (
            <p className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-2xl px-4 py-3 text-sm text-center">{formError}</p>
          )}
          {formNotice && (
            <p className="bg-green-50 border border-green-200 text-green-800 font-semibold rounded-2xl px-4 py-3 text-sm text-center">{formNotice}</p>
          )}

          <button 
            type="submit"
            className={`w-full font-bold py-3 rounded-2xl mt-1 transition-all shadow-md hover:shadow-lg cursor-pointer ${
              view === 'signup' && (!isPasswordValid || !isEmailValid || !firstName.trim() || !lastName.trim() || !dateOfBirth || !isPhoneValid)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-[#0066ff] hover:bg-blue-700 text-white'
            }`}
            disabled={view === 'signup' && (!isPasswordValid || !isEmailValid || !firstName.trim() || !lastName.trim() || !dateOfBirth || !isPhoneValid)}
          >
            {view === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-5 font-medium">
          {view === 'login' ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => { setView('signup'); setFormError(''); setFormNotice(''); }} className="text-blue-600 hover:underline font-semibold cursor-pointer">Sign up</button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => { setView('login'); setFormError(''); setFormNotice(''); }} className="text-blue-600 hover:underline font-semibold cursor-pointer">Log In</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}