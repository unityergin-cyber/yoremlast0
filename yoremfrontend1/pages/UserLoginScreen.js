import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { useKullanici } from '../context/KullaniciContext';
import { API_URL } from '../src/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

function UserLoginScreen(props) {
  const {setTelefonNumarasi, setKullaniciId } = useKullanici();
  const {purpose,setPurpose} = useKullanici();
  const [telefonNoGirdi, setTelefonNoGirdi] = useState('');
  const [loading, setLoading] = useState(false);
  const [hataVar, setHataVar] = useState(false);
  const [hataMesaji, setHataMesaji] = useState('');

  function handleChangeText(text) {
    setTelefonNoGirdi(text);
    setHataVar(false); // Kullanıcı yeni giriş yaparken hatayı temizle
  }

  async function handleLogin() {
    if (!telefonNoGirdi.trim()) {
      setHataVar(true);
      setHataMesaji('Lütfen telefon numaranızı girin');
      return;
    }

    if (telefonNoGirdi.length !== 10) {
      setHataVar(true);
      setHataMesaji('Telefon numarası 10 haneli olmalıdır');
      return;
    }

    setLoading(true);
    setHataVar(false);
    setHataMesaji('');

    // Timeout ile fetch işlemi - 5 saniye timeout
    const timeoutDuration = 5000; // 5 saniye
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

    try {
      const startTime = Date.now();
      console.log('🔵 Login isteği gönderiliyor:', `${API_URL}/auth/login`);
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: telefonNoGirdi }),
        signal: controller.signal,
      });

      const endTime = Date.now();
      console.log(`⏱️ İstek süresi: ${endTime - startTime}ms`);

      clearTimeout(timeoutId);

      console.log('🔵 Response status:', response.status);

      // Response'u text olarak al (JSON parse hatası olabilir)
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parse hatası:', parseError);
        throw new Error('Sunucudan geçersiz yanıt geldi');
      }

      if (response.ok) {
        // Login başarılı
        console.log('✅ Login başarılı:', data);
        
        // Context'e telefon ve ID bilgisini kaydet
        setTelefonNumarasi(telefonNoGirdi);
        setPurpose("login");
        // Telefon numarasını AsyncStorage'a kaydet
        await AsyncStorage.setItem('telefonNumarasi', telefonNoGirdi);
        setTelefonNumarasi(telefonNoGirdi);
        // Doğrulama ekranına yönlendir
        props.navigation.navigate('GirisYap');
      } else {
        // Login başarısız
        setHataVar(true);
        setHataMesaji(data.message || 'Giriş yapılamadı');
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('❌ Login error:', error);
      
      if (error.name === 'AbortError') {
        setHataVar(true);
        setHataMesaji('İstek zaman aşımına uğradı (5 saniye). Backend\'in çalıştığından ve IP adresinin doğru olduğundan emin olun.');
      } else if (error.message.includes('Network request failed') || 
                 error.message.includes('fetch') ||
                 error.message.includes('Failed to connect')) {
        setHataVar(true);
        setHataMesaji(`Sunucuya bağlanılamıyor (${API_URL}). Backend çalışıyor mu? Aynı Wi-Fi ağında mısınız?`);
      } else {
        setHataVar(true);
        setHataMesaji(error.message || 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.formContainer}>
        <Text style={styles.title}>Giriş Yap</Text>

        <Text style={styles.label}>Telefon Numarası</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.prefixText}>0</Text>
          <TextInput
            style={styles.input}
            onChangeText={handleChangeText}
            placeholder="5XX XXX XX XX"
            keyboardType="phone-pad"
            value={telefonNoGirdi}
            maxLength={10}
          />
        </View>
        
        {hataVar && (
          <Text style={styles.hataMesaji}>{hataMesaji}</Text>
        )}

        <TouchableOpacity
          style={[
            styles.loginButton,
            (loading || !telefonNoGirdi || telefonNoGirdi.length !== 10) && styles.disabledButton
          ]}
          onPress={handleLogin}
          disabled={loading || !telefonNoGirdi || telefonNoGirdi.length !== 10}
        >
          <Text style={styles.loginButtonText}>
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => props.navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '5%',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: '8%',
    color: '#FF6B00', // Turuncu tema rengi
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    alignSelf: 'flex-start',
    marginLeft: '10%',
    marginBottom: '1.5%',
    color: '#555',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: '4%',
    backgroundColor: 'white',
  },
  prefixText: {
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#666',
  },
  input: {
    flex: 1,
    minHeight: 50,
    padding: 10,
    fontSize: 16,
  },
  hataMesaji: {
    color: '#FF3B30', // Daha modern bir hata rengi
    marginBottom: '5%',
    alignSelf: 'flex-start',
    marginLeft: '10%',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#FF6B00', // Turuncu tema rengi
    paddingVertical: 15,
    borderRadius: 25,
    width: '80%',
    alignItems: 'center',
    marginTop: '5%',
    shadowColor: "#FF6B00",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowOpacity: 0.1,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: '5%',
    padding: 10,
  },
  backButtonText: {
    color: '#FF6B00', // Turuncu tema rengi
    fontSize: 14,
    fontWeight: '500',
  }
});

export default UserLoginScreen;