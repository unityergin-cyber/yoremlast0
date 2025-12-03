import React, { useState, useEffect } from "react";
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Alert, 
    ActivityIndicator,
    SafeAreaView,
    Animated,
    Modal,
    TextInput
} from 'react-native';
import { useKullanici } from '../context/KullaniciContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../src/config/api';
import BottomTabBar from '../components/BottomTabBar';

function AccountScreen(props) {
    const { 
        kullaniciId, 
        setKullaniciId, 
        telefonNumarasi,
        setTelefonNumarasi,
        logout
    } = useKullanici();

    const [kullaniciBilgileri, setKullaniciBilgileri] = useState({
        ad: '',
        soyad: '',
        telefon: telefonNumarasi || ''
    });
    const [yukleniyor, setYukleniyor] = useState(true);
    const [cikisYapiliyor, setCikisYapiliyor] = useState(false);
    const [girisYokMesaji, setGirisYokMesaji] = useState(false);
    const [hesapSiliniyorModalGorunur, setHesapSiliniyorModalGorunur] = useState(false);
    const [onayMetni, setOnayMetni] = useState('');
    const [hesapSiliniyor, setHesapSiliniyor] = useState(false);
    
    const fadeAnim = useState(new Animated.Value(0))[0];
    const slideAnim = useState(new Animated.Value(50))[0];

    useEffect(() => {
        const kontrolEt = async () => {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                setGirisYokMesaji(true);
                setYukleniyor(false);
                
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    })
                ]).start();
                
                return;
            }
            setGirisYokMesaji(false);
        };
        kontrolEt();
    }, []);

    useEffect(() => {
        const profilBilgileriniGetir = async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');

                if (!token) {
                    setYukleniyor(false);
                    return;
                }
                
                const response = await fetch(`${API_URL}/auth/profile`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Profil bilgileri alınamadı');
                }

                const data = await response.json();
                const nameParts = data.full_name ? data.full_name.split(' ') : [];
                
                setKullaniciBilgileri({
                    ad: nameParts[0] || '',
                    soyad: nameParts.slice(1).join(' ') || '',
                    telefon: data.phone || telefonNumarasi
                });
            } catch (error) {
                console.error("Profil bilgileri çekme hatası:", error);
                Alert.alert("Hata", "Profil bilgileri yüklenirken bir sorun oluştu.");
            } finally {
                setYukleniyor(false);
            }
        };

        profilBilgileriniGetir();
    }, []);

    function handleAdreslerimButton() {
        props.navigation.navigate("Adreslerim");
    }

    function handleSiparislerimButton() {
        props.navigation.navigate("Siparislerim");
    }

    async function handleLogout() {
        Alert.alert(
          "Çıkış Yap",
          "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
          [
            {
              text: "İptal",
              style: "cancel"
            },
            {
              text: "Çıkış Yap",
              onPress: async () => {
                try {
                  setCikisYapiliyor(true);
                  await logout();
                  
                  setTimeout(() => {
                    try {
                      props.navigation.reset({
                        index: 0,
                        routes: [{ name: 'Main' }],
                      });
                    } catch (navError) {
                      Alert.alert("Hata", "Çıkış sonrası sayfa yönlendirmesi başarısız oldu.");
                    }
                    setCikisYapiliyor(false);
                  }, 500);
                } catch (error) {
                  Alert.alert("Hata", "Çıkış yapılırken bir hata oluştu.");
                  setCikisYapiliyor(false);
                }
              }
            }
          ]
        );
    }

    function handleHesabiSilButton() {
        setHesapSiliniyorModalGorunur(true);
        setOnayMetni('');
    }

    async function handleHesabiSilOnayla() {
        const normalizedText = onayMetni.toUpperCase().replace(/İ/g, 'I');
        if (normalizedText !== 'SIL') {
            Alert.alert("Uyarı", "Hesabınızı silmek için 'SIL' yazmanız gerekmektedir.");
            return;
        }

        try {
            setHesapSiliniyor(true);
            let token = await AsyncStorage.getItem('userToken');

            if (!token) {
                Alert.alert("Hata", "Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.");
                setHesapSiliniyor(false);
                // Kullanıcıyı giriş ekranına yönlendir
                await logout();
                props.navigation.reset({
                    index: 0,
                    routes: [{ name: 'Start' }],
                });
                return;
            }

            // Token'ı temizle (başında/sonunda boşluk varsa)
            token = token.trim();

            // Token'ın geçerliliğini kontrol et (profil endpoint'i ile)
            try {
                const profileCheck = await fetch(`${API_URL}/auth/profile`, {
                    method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

                if (!profileCheck.ok) {
                    // Token geçersiz, kullanıcıyı yeniden giriş yapmaya yönlendir
                    Alert.alert(
                        "Oturum Süresi Doldu", 
                        "Oturumunuzun süresi dolmuş. Lütfen tekrar giriş yapın.",
                        [
                            {
                                text: "Tamam",
                                onPress: async () => {
                                    await logout();
                                    props.navigation.reset({
                                        index: 0,
                                        routes: [{ name: 'Start' }],
                                    });
                                }
                            }
                        ]
                    );
                    setHesapSiliniyor(false);
                    return;
                }
            } catch (profileError) {
                console.error("Token doğrulama hatası:", profileError);
                Alert.alert("Hata", "Oturum bilgisi doğrulanamadı. Lütfen tekrar giriş yapın.");
                setHesapSiliniyor(false);
                await logout();
                props.navigation.reset({
                    index: 0,
                    routes: [{ name: 'Start' }],
                });
                return;
            }

            console.log("🔵 API URL:", `${API_URL}/auth/delete-account`);
            console.log("🔵 Token uzunluğu:", token.length);

            // Timeout ile fetch işlemi
            const timeoutDuration = 10000; // 10 saniye
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

            let response;
            try {
                response = await fetch(`${API_URL}/auth/delete-account`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('İstek zaman aşımına uğradı (10 saniye). Backend\'e bağlanılamadı.');
                }
                if (fetchError.message.includes('Network request failed') || 
                    fetchError.message.includes('Failed to connect')) {
                    throw new Error(`Backend'e bağlanılamadı: ${API_URL}. Backend çalışıyor mu?`);
                }
                throw fetchError;
            }

            console.log("🔵 Response status:", response.status);
            console.log("🔵 Response ok:", response.ok);

            // Response'u text olarak al
            let responseText = '';
            try {
                responseText = await response.text();
            console.log("🔵 Response text:", responseText);
                console.log("🔵 Response text length:", responseText.length);
            } catch (textError) {
                console.error("❌ Response text okuma hatası:", textError);
                throw new Error(`Response okunamadı: ${textError.message}`);
            }

            // Response boş olabilir (204 No Content gibi)
            let data = null;
            if (responseText && responseText.trim() !== '') {
            try {
                data = JSON.parse(responseText);
                    console.log("🔵 Parsed data:", data);
            } catch (parseError) {
                console.error("❌ JSON parse hatası:", parseError);
                console.error("❌ Gelen yanıt:", responseText.substring(0, 200));
                    // JSON parse hatası olsa bile, eğer status başarılıysa devam et
                    if (!response.ok) {
                        const parseErrorMessage = `Sunucudan geçersiz yanıt geldi. Status: ${response.status}, Response: ${responseText.substring(0, 100)}`;
                        console.error("❌ Parse hatası ile birlikte response başarısız:", parseErrorMessage);
                        throw new Error(parseErrorMessage);
            }
                }
            } else {
                console.log("🔵 Response boş (204 No Content gibi olabilir)");
            }

            // Response başarısızsa hata fırlat
            if (!response.ok) {
                // Backend'den gelen hata mesajını al
                const backendError = data?.error || data?.data?.error || '';
                const backendMessage = data?.message || data?.data?.message || '';
                const errorMessage = backendMessage || backendError || `Sunucu hatası: ${response.status}`;
                
                console.error("❌ Response başarısız:", {
                    status: response.status,
                    statusText: response.statusText,
                    errorMessage: errorMessage,
                    backendError: backendError,
                    backendMessage: backendMessage,
                    data: data,
                    responseText: responseText
                });
                
                // Eğer token hatası ise özel işleme
                if (errorMessage.toLowerCase().includes('token') || 
                    errorMessage.toLowerCase().includes('geçersiz') ||
                    errorMessage.toLowerCase().includes('unauthorized') ||
                    response.status === 401) {
                    Alert.alert(
                        "Oturum Süresi Doldu",
                        "Oturumunuzun süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapın.",
                        [
                            {
                                text: "Tamam",
                                onPress: async () => {
                                    await logout();
                                    props.navigation.reset({
                                        index: 0,
                                        routes: [{ name: 'Start' }],
                                    });
                                }
                            }
                        ]
                    );
                    setHesapSiliniyor(false);
                    return;
                }
                
                // Backend veritabanı hatası kontrolü
                if (backendError && backendError.includes('Unknown column')) {
                    const detailedError = `Backend veritabanı hatası: ${backendError}\n\nBu bir backend sorunudur. Lütfen backend geliştiricisine bildirin.`;
                    throw new Error(detailedError);
                }
                
                // 500 hatası için özel mesaj
                if (response.status === 500) {
                    const serverError = backendError 
                        ? `Sunucu hatası (500): ${backendError}\n\n${backendMessage || ''}`
                        : `Sunucu hatası (500): ${errorMessage}`;
                    throw new Error(serverError);
                }
                
                throw new Error(errorMessage || `HTTP ${response.status}: ${response.statusText || 'Bilinmeyen hata'}`);
            }

            // Başarılı silme işlemi
            Alert.alert(
                "Başarılı",
                "Hesabınız başarıyla silindi. Tekrar görüşmek üzere!",
                [
                    {
                        text: "Tamam",
                        onPress: async () => {
                            try {
                            await logout();
                            setHesapSiliniyorModalGorunur(false);
                            props.navigation.reset({
                                index: 0,
                                routes: [{ name: 'Main' }],
                            });
                            } catch (logoutError) {
                                console.error("Logout hatası:", logoutError);
                                // Logout hatası olsa bile ana sayfaya yönlendir
                                setHesapSiliniyorModalGorunur(false);
                                props.navigation.reset({
                                    index: 0,
                                    routes: [{ name: 'Main' }],
                                });
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.error("❌ Hesap silme hatası:", error);
            console.error("❌ Hata detayları:", {
                name: error?.name || 'Unknown',
                message: error?.message || 'No message',
                stack: error?.stack || 'No stack',
                toString: error?.toString?.() || String(error)
            });
            
            // Error mesajını daha güvenli şekilde al
            let errorMessage = "Hesap silinirken bir sorun oluştu. Lütfen tekrar deneyin.";
            if (error && typeof error === 'object') {
                errorMessage = error.message || error.toString() || errorMessage;
            } else if (error) {
                errorMessage = String(error);
            }
            
            // Daha detaylı hata mesajları
            const errorMsg = error?.message || errorMessage || '';
            if (errorMsg.includes('zaman aşımı') || errorMsg.includes('timeout')) {
                errorMessage = "Backend'e bağlanılamadı: Zaman aşımı. Backend çalışıyor mu?";
            } else if (errorMsg.includes('Network request failed') || 
                       errorMsg.includes('Failed to connect')) {
                errorMessage = `Backend'e bağlanılamadı (${API_URL}). Backend çalışıyor mu? Aynı Wi-Fi ağında mısınız?`;
            } else if (errorMsg.includes('Sunucudan geçersiz yanıt') || errorMsg.includes('Response okunamadı')) {
                errorMessage = "Backend'den geçersiz yanıt geldi. Backend loglarını kontrol edin.";
            }
            
            // Token hatası kontrolü
            if (errorMessage.toLowerCase().includes('token') || 
                errorMessage.toLowerCase().includes('geçersiz') ||
                errorMessage.toLowerCase().includes('unauthorized') ||
                errorMessage.toLowerCase().includes('oturum')) {
                Alert.alert(
                    "Oturum Süresi Doldu",
                    "Oturumunuzun süresi dolmuş. Lütfen tekrar giriş yapın.",
                    [
                        {
                            text: "Tamam",
                            onPress: async () => {
                                await logout();
                                props.navigation.reset({
                                    index: 0,
                                    routes: [{ name: 'Start' }],
                                });
                            }
                        }
                    ]
                );
            } else {
                Alert.alert(
                    "Hesap Silme Hatası", 
                    errorMessage,
                    [{ text: "Tamam" }]
                );
            }
        } finally {
            setHesapSiliniyor(false);
        }
    }

    // 🔸 Giriş yapılmamış ekran (turuncu tonlu mesajlı görünüm)
    if (girisYokMesaji) {
        return (
            <SafeAreaView style={styles.mainContainer}>
                <Animated.View 
                    style={[
                        styles.girisGerekliContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <View style={styles.iconContainer}>
                        <Text style={styles.iconText}>🔒</Text>
                    </View>
                    
                    <Text style={styles.girisBaslik}>Hesabınıza Giriş Yapın</Text>
                    <Text style={styles.girisAciklama}>
                        Siparişlerinizi görmek, adreslerinizi yönetmek ve size özel fırsatlara erişmek için giriş yapmanız gerekmektedir.
                    </Text>

                    <View style={styles.messageBox}>
                        <Text style={styles.messageText}>
                            👋 Merhaba! Henüz giriş yapmadınız. Hemen giriş yaparak size özel avantajlardan yararlanın!
                        </Text>
                    </View>
                    
                    <TouchableOpacity 
                        style={styles.girisButton}
                        onPress={() => props.navigation.replace('Start')}
                    >
                        <Text style={styles.girisButtonText}>Giriş Yap</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.anasayfaButton}
                        onPress={() => props.navigation.replace('Main')}
                    >
                        <Text style={styles.anasayfaButtonText}>Ana Sayfaya Dön</Text>
                    </TouchableOpacity>
                </Animated.View>
                
                <View style={styles.tabBarContainer}>
                    <BottomTabBar />
                </View>
            </SafeAreaView>
        );
    }

    if (yukleniyor || cikisYapiliyor) {
        return (
            <SafeAreaView style={styles.mainContainer}>
                <View style={styles.yuklemeContainer}>
                    <ActivityIndicator size="large" color="#FF8C42" />
                    <Text style={styles.yuklemeText}>
                        {cikisYapiliyor ? "Çıkış yapılıyor..." : "Profil bilgileri yükleniyor..."}
                    </Text>
                </View>
                <View style={styles.tabBarContainer}>
                    <BottomTabBar />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.mainContainer}>
            <View style={styles.container}>
                <TouchableOpacity 
                    style={styles.kutu}
                    onPress={() => console.log("Profil düzenlemeye tıklandı")}
                >
                    <Text style={styles.kullaniciAdi}>
                        {kullaniciBilgileri.ad} {kullaniciBilgileri.soyad}
                    </Text>
                    <Text style={styles.telefon}>{kullaniciBilgileri.telefon}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.kutu}
                    onPress={handleAdreslerimButton}
                >
                    <Text style={styles.menuBaslik}>Adreslerim</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.kutu}
                    onPress={handleSiparislerimButton}
                >
                    <Text style={styles.menuBaslik}>Siparişlerim</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.cikisButon}
                    onPress={handleLogout}
                    disabled={cikisYapiliyor}
                >
                    <Text style={styles.cikisText}>Çıkış Yap</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.hesapSilButon}
                    onPress={handleHesabiSilButton}
                >
                    <Text style={styles.hesapSilText}>Hesabımı Sil</Text>
                </TouchableOpacity>
            </View>
            
            <View style={styles.tabBarContainer}>
                <BottomTabBar />
            </View>

            {/* Hesap Silme Modal */}
            <Modal
                visible={hesapSiliniyorModalGorunur}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setHesapSiliniyorModalGorunur(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalBaslik}>⚠️ Hesabı Sil</Text>
                        
                        <Text style={styles.modalAciklama}>
                            Hesabınızı silmek üzeresiniz. Bu işlem geri alınamaz ve tüm verileriniz kalıcı olarak silinecektir:
                        </Text>
                        
                        <View style={styles.uyariKutusu}>
                            <Text style={styles.uyariMetni}>• Tüm siparişleriniz silinecek</Text>
                            <Text style={styles.uyariMetni}>• Kayıtlı adresleriniz silinecek</Text>
                            <Text style={styles.uyariMetni}>• Hesap bilgileriniz kalıcı olarak silinecek</Text>
                        </View>
                        
                        <Text style={styles.onayText}>
                            Devam etmek için lütfen <Text style={styles.onayVurgu}>"SIL"</Text> yazın:
                        </Text>
                        
                        <TextInput
                            style={styles.onayInput}
                            placeholder="SIL yazın"
                            value={onayMetni}
                            onChangeText={setOnayMetni}
                            autoCapitalize="characters"
                            maxLength={3}
                        />
                        
                        <View style={styles.modalButonlar}>
                            <TouchableOpacity 
                                style={styles.iptalButon}
                                onPress={() => {
                                    setHesapSiliniyorModalGorunur(false);
                                    setOnayMetni('');
                                }}
                                disabled={hesapSiliniyor}
                            >
                                <Text style={styles.iptalButonText}>İptal</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[
                                    styles.silButon,
                                    (hesapSiliniyor || onayMetni.toUpperCase().replace(/İ/g, 'I') !== 'SIL') && styles.silButonPasif
                                ]}
                                onPress={handleHesabiSilOnayla}
                                disabled={hesapSiliniyor || onayMetni.toUpperCase().replace(/İ/g, 'I') !== 'SIL'}
                            >
                                {hesapSiliniyor ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text style={styles.silButonText}>Hesabı Sil</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#FFF8F3',
        position: 'relative',
    },
    container: {
        flex: 1,
        padding: 20,
        paddingBottom: 80,
    },
    kutu: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 18,
        marginVertical: 10,
        shadowColor: "#FF8C42",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3.84,
        elevation: 3
    },
    kullaniciAdi: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5
    },
    telefon: {
        fontSize: 16,
        color: '#666',
        marginTop: 5
    },
    menuBaslik: {
        fontSize: 16,
        textAlign: 'center',
        color: '#333',
        fontWeight: '500'
    },
    cikisButon: {
        backgroundColor: '#FF6B35',
        padding: 16,
        borderRadius: 25,
        marginTop: 'auto',
        marginBottom: 15,
        alignItems: 'center',
        shadowColor: "#FF6B35",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 3
    },
    cikisText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
    hesapSilButon: {
        backgroundColor: 'transparent',
        padding: 16,
        borderRadius: 25,
        marginBottom: 35,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D32F2F',
    },
    hesapSilText: {
        color: '#D32F2F',
        fontWeight: '600',
        fontSize: 15
    },
    yuklemeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF8F3'
    },
    yuklemeText: {
        marginTop: 12,
        color: '#666',
        fontSize: 16
    },
    tabBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100
    },
    girisGerekliContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
        paddingBottom: 100,
        backgroundColor: '#FFF8F3',
    },
    iconContainer: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#FFE1C6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
    },
    iconText: {
        fontSize: 52,
    },
    girisBaslik: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FF6B35',
        textAlign: 'center',
        marginBottom: 10,
    },
    girisAciklama: {
        fontSize: 16,
        color: '#7A7A7A',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 25,
        paddingHorizontal: 20,
    },
    messageBox: {
        backgroundColor: '#FFEDD8',
        borderLeftWidth: 5,
        borderLeftColor: '#FF8C42',
        padding: 15,
        borderRadius: 12,
        marginBottom: 35,
        shadowColor: '#FF8C42',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 4,
        elevation: 4,
    },
    messageText: {
        color: '#5A3E2B',
        fontSize: 15,
        textAlign: 'center',
        fontWeight: '500',
    },
    girisButton: {
        backgroundColor: '#FF8C42',
        paddingVertical: 16,
        paddingHorizontal: 60,
        borderRadius: 25,
        marginBottom: 15,
        width: '100%',
        alignItems: 'center',
        shadowColor: "#FF8C42",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
        elevation: 6,
    },
    girisButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    anasayfaButton: {
        backgroundColor: 'transparent',
        paddingVertical: 16,
        paddingHorizontal: 60,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#FF8C42',
        width: '100%',
        alignItems: 'center',
    },
    anasayfaButtonText: {
        color: '#FF8C42',
        fontSize: 18,
        fontWeight: '600',
    },
    // Modal Stilleri
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 25,
        width: '100%',
        maxWidth: 400,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    modalBaslik: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#D32F2F',
        textAlign: 'center',
        marginBottom: 15,
    },
    modalAciklama: {
        fontSize: 15,
        color: '#555',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 15,
    },
    uyariKutusu: {
        backgroundColor: '#FFEBEE',
        borderLeftWidth: 4,
        borderLeftColor: '#D32F2F',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    uyariMetni: {
        fontSize: 14,
        color: '#C62828',
        marginVertical: 3,
        fontWeight: '500',
    },
    onayText: {
        fontSize: 15,
        color: '#333',
        textAlign: 'center',
        marginBottom: 10,
    },
    onayVurgu: {
        fontWeight: 'bold',
        color: '#D32F2F',
    },
    onayInput: {
        borderWidth: 2,
        borderColor: '#DDD',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: 'bold',
        backgroundColor: '#F9F9F9',
    },
    modalButonlar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    iptalButon: {
        flex: 1,
        backgroundColor: '#E0E0E0',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    iptalButonText: {
        color: '#555',
        fontSize: 16,
        fontWeight: '600',
    },
    silButon: {
        flex: 1,
        backgroundColor: '#D32F2F',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    silButonPasif: {
        backgroundColor: '#FFCDD2',
    },
    silButonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default AccountScreen;