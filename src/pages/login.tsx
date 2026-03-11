import { createSignal, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { store } from '../app';
import Button from '../components/ui/Button';

export default function LoginPage() {
  const navigate = useNavigate();
  const [isRegisterMode, setIsRegisterMode] = createSignal(false);
  const [identifier, setIdentifier] = createSignal('');
  const [newEmail, setNewEmail] = createSignal('');
  const [newUsername, setNewUsername] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier().trim() || !password().trim()) {
      setError('Ingresa usuario o correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const normalizedIdentifier = identifier().trim().toLowerCase();
      const users = await store.query('users', {});

      const matchedUser = users.find((user) => {
        const username = String(user.username ?? '').toLowerCase();
        const email = String(user.email ?? '').toLowerCase();
        return username === normalizedIdentifier || email === normalizedIdentifier;
      });

      if (!matchedUser) {
        setError('No existe una cuenta con ese usuario o correo.');
        return;
      }

      if (Number(matchedUser.status) !== 1) {
        setError('Tu cuenta no está activa.');
        return;
      }

      if (String(matchedUser.password ?? '') !== password().trim()) {
        setError('Contraseña incorrecta.');
        return;
      }

      await store.setUser(matchedUser);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: SubmitEvent) => {
    e.preventDefault();
    setError('');

    if (!newEmail().trim() || !newUsername().trim() || !password().trim()) {
      setError('Ingresa correo, nombre de usuario y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const email = newEmail().trim().toLowerCase();
      const username = newUsername().trim();

      const existingByEmail = await store.query('users', { email });
      const existingByUsername = await store.query('users', { username });

      if (existingByEmail.length > 0) {
        setError('Ese correo ya está registrado.');
        return;
      }

      if (existingByUsername.length > 0) {
        setError('Ese nombre de usuario ya existe.');
        return;
      }

      const [createdId] = await store.insert('users', {
        status: 1,
        admin: true,
        firstname: username,
        lastname: '',
        username,
        email,
        password: password().trim(),
        apiKey: null,
        apiKeyExpiresAt: null,
        apiKeyLastUsed: null,
        conectedOn: null,
        lastLogoutAt: null,
        test_icon: '',
      });

      const createdUser = (await store.query('users', { id: createdId }))?.[0];
      if (!createdUser) {
        setError('No se pudo crear la cuenta. Intenta nuevamente.');
        return;
      }

      await store.setUser(createdUser);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section class="min-h-[calc(100vh-3rem)] flex items-center justify-center bg-gradient-to-br from-cyan-200 via-sky-300 to-blue-900 p-6">
      <div class="w-full max-w-md bg-white/95 backdrop-blur-sm border border-cyan-100 rounded-xl shadow-md p-6">
        <h1 class="text-2xl font-bold text-gray-900">{isRegisterMode() ? 'Crear cuenta' : 'Iniciar sesión'}</h1>
        <p class="text-sm text-gray-500 mt-1">
          {isRegisterMode() ? 'Ingresa correo, nombre de usuario y contraseña.' : 'Ingresa tu usuario o correo y contraseña.'}
        </p>

        <Show
          when={!isRegisterMode()}
          fallback={
            <div class="mt-6 space-y-4 rounded-xl bg-slate-100/70 p-4 border border-slate-200">
            <form class="space-y-4" onSubmit={handleRegister}>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                <input
                  type="email"
                  value={newEmail()}
                  onInput={(e) => setNewEmail(e.currentTarget.value)}
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="usuario@correo.com"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nombre de usuario</label>
                <input
                  value={newUsername()}
                  onInput={(e) => setNewUsername(e.currentTarget.value)}
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="mi_usuario"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password()}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>

              <Show when={error()}>
                <p class="text-sm text-red-600">{error()}</p>
              </Show>

              <Button type="submit" variant="primary" class="w-full" disabled={loading()}>
                {loading() ? 'Creando cuenta...' : 'Crear cuenta'}
              </Button>
            </form>
            </div>
          }
        >
          <div class="mt-6 space-y-4 rounded-xl bg-slate-100/70 p-4 border border-slate-200">
          <form class="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Usuario o correo</label>
              <input
                value={identifier()}
                onInput={(e) => setIdentifier(e.currentTarget.value)}
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="usuario@correo.com"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            <Show when={error()}>
              <p class="text-sm text-red-600">{error()}</p>
            </Show>

            <Button type="submit" variant="primary" class="w-full" disabled={loading()}>
              {loading() ? 'Verificando...' : 'Iniciar sesión'}
            </Button>
          </form>
          </div>
        </Show>

        <button
          class="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          onClick={() => alert('Integración con Google pendiente de configurar.')}
        >
          <span class="inline-flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="w-4 h-4" aria-hidden="true">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.653 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.844 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.844 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4c-7.682 0-14.322 4.337-17.694 10.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.138 35.091 26.7 36 24 36c-5.202 0-9.618-3.317-11.283-7.946l-6.52 5.025C9.53 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.794 2.237-2.231 4.166-4.084 5.57.001-.001 6.19 5.238 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
            Iniciar sesión con Google
          </span>
        </button>

        <p class="text-sm text-gray-600 mt-5 text-center">
          {isRegisterMode() ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
          <button
            class="text-blue-600 hover:text-blue-700 font-medium"
            onClick={() => {
              setError('');
              setPassword('');
              setIdentifier('');
              setNewEmail('');
              setNewUsername('');
              setIsRegisterMode(!isRegisterMode());
            }}
          >
            {isRegisterMode() ? 'Inicia sesión' : 'Crea una'}
          </button>
        </p>
      </div>
    </section>
  );
}