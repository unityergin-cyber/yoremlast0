import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Image, 
    TouchableOpacity, 
    ScrollView,
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../src/config/api';
import { useKullanici } from '../context/KullaniciContext';
import BottomTabBar from '../components/BottomTabBar';

const { height } = Dimensions.get('window');
// TabBar için daha büyük bir yükseklik değeri (platform özel)
const BOTTOM_TAB_HEIGHT = Platform.OS === 'ios' ? 85 : 65;
// Ödeme alanı yüksekliği - ARTIRILDI
const PAYMENT_AREA_HEIGHT = 180; // Orijinal değer 140 idi

function UserAddToCardScreen({ navigation }) {
    const { siparisDetaylari, userToken, isLoggedIn } = useKullanici();
    const [sepet, setSepet] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(true);

    // SeÃ§enekleri guvenli sekilde parse edip fiyat ayarlamalarini topla
    const parseOptionsAndPrice = (options) => {
        const result = { parsed: null, rawString: "", price: 0, hasPrice: false };
        if (!options) return result;

        const raw = typeof options === "string" ? options.trim() : options;
        if (typeof raw === "string") result.rawString = raw;

        const tryParse = (value) => {
            try {
                return JSON.parse(value);
            } catch {
                return null;
            }
        };

        if (typeof raw === "string" && raw) {
            const looksComplete =
                (raw.startsWith("[") && raw.endsWith("]")) ||
                (raw.startsWith("{") && raw.endsWith("}"));
            if (looksComplete) {
                result.parsed = tryParse(raw) || tryParse(raw.replace(/'/g, '"'));
            }
        } else if (Array.isArray(raw) || typeof raw === "object") {
            result.parsed = raw;
        }

        const addAdjustments = (vals = []) => {
            vals.forEach((val) => {
                const mod = val?.price_adjustment ?? val?.priceModifier ?? val?.price_modifier;
                if (mod !== undefined && mod !== null) {
                    const adj = parseFloat(mod);
                    if (!isNaN(adj)) {
                        result.price += adj;
                        result.hasPrice = true;
                    }
                }
            });
        };

        if (Array.isArray(result.parsed)) {
            result.parsed.forEach((opt) => {
                if (opt && Array.isArray(opt.values)) addAdjustments(opt.values);
            });
        } else if (result.parsed && typeof result.parsed === "object") {
            Object.values(result.parsed).forEach((opt) => {
                if (opt && Array.isArray(opt.values)) addAdjustments(opt.values);
            });
        }

        if (!result.hasPrice && typeof raw === "string") {
            const regex = /["']price(?:_)?(?:adjustment|modifier)["']\s*:\s*(-?\d+(?:\.\d+)?)/gi;
            let match;
            while ((match = regex.exec(raw)) !== null) {
                const adj = parseFloat(match[1]);
                if (!isNaN(adj)) result.price += adj;
            }
        }

        return result;
    };

    // SeÃ§eneklerin metinsel gosterimi
    const buildOptionText = (parsedOptions, rawString = "") => {
        const parts = [];

        if (Array.isArray(parsedOptions)) {
            parsedOptions.forEach((option) => {
                if (option && Array.isArray(option.values)) {
                    const valueTexts = option.values
                        .filter((val) => val?.value || val?.name)
                        .map((val) => val.value || val.name)
                        .join(", ");
                    if (valueTexts) parts.push(option.name ? `${option.name}: ${valueTexts}` : valueTexts);
                }
            });
        } else if (parsedOptions && typeof parsedOptions === "object") {
            Object.values(parsedOptions).forEach((option) => {
                if (option && Array.isArray(option.values)) {
                    const valueTexts = option.values
                        .filter((val) => val?.value || val?.name)
                        .map((val) => val.value || val.name)
                        .join(", ");
                    if (valueTexts) parts.push(option.name ? `${option.name}: ${valueTexts}` : valueTexts);
                } else if (option?.value) {
                    parts.push(option.value);
                }
            });
        }

        if (parts.length === 0 && rawString) {
            const valueRegex = /["']value["']\s*:\s*["']([^"']+)["']/gi;
            let match;
            while ((match = valueRegex.exec(rawString)) !== null) {
                if (match[1]) parts.push(match[1]);
            }
            if (parts.length === 0) {
                const cleaned = rawString.replace(/[\[\]{}"]/g, "").trim();
                if (cleaned) parts.push(cleaned);
            }
        }

        return parts.length > 0 ? parts.join(" | ") : "Standart";
    };

    useEffect(() => {
        sepetVerileriniGetir();
    }, []);

    useEffect(() => {
        if (siparisDetaylari) {
            sepetVerileriniGetir();
        }
    }, [siparisDetaylari]);

    const sepetVerileriniGetir = async () => {
        try {
            setYukleniyor(true);
            
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                setYukleniyor(false);
                return;
            }
        
            // URL'yi kontrol edin - API yolunuzu gösterin
            console.log("Sepet API URL'si:", `${API_URL}/api/products/cart`);
            
            const response = await fetch(`${API_URL}/api/products/cart`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        
            console.log('Sepet API Yanıt Durumu:', response.status);
            
            // İstek gövdesini loglayalım
            const responseText = await response.text();
            console.log('Sepet API Yanıt Gövdesi:', responseText);
            
            // Yanıt boş değilse işleyelim
            if (responseText.trim()) {
                try {
                    const responseData = JSON.parse(responseText);
                    console.log("Çözümlenmiş sepet verisi:", responseData);
                    
                                          if (responseData.cart && Array.isArray(responseData.cart)) {
                        const formatlanmisSepet = responseData.cart.map(item => {
                            const { parsed, rawString, price: optionsPrice } = parseOptionsAndPrice(item.options);
                            const seceneklerText = buildOptionText(parsed, rawString);
                            const baseFiyat = parseFloat(item.base_price || item.unit_price || item.price || 0);
                            const serverOptionsPrice = item.options_price !== undefined ? parseFloat(item.options_price) || 0 : null;
                            // Sunucunun döndürdüğü base_price genellikle seçenek dahil; varsa onu kullan, yoksa manuel ekle
                            const toplamFiyat = serverOptionsPrice !== null ? baseFiyat : baseFiyat + optionsPrice;
                            
                            return {
                                id: item.id,
                                ad: item.name || "Isimsiz urun",
                                resim: item.image_url,
                                fiyat: parseFloat(item.base_price || item.unit_price || item.price || 0) + optionsPrice,
                                adet: item.quantity || 1,
                                boyut: seceneklerText,
                                productId: item.product_id
                            };
                        });
                        
                        setSepet(formatlanmisSepet);
                    } else {
                        setSepet([]);
                    }
                } catch (jsonError) {
                    console.error('JSON çözümleme hatası:', jsonError);
                    setSepet([]);
                }
            } else {
                setSepet([]);
            }
        } catch (error) {
            console.error('Sepet verileri yüklenirken hata oluştu:', error);
            setSepet([]);
        } finally {
            setYukleniyor(false);
        }
    };

    const updateCartItemQuantity = async (id, newQuantity) => {
        try {
            const response = await fetch(`${API_URL}/api/products/cart/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    quantity: newQuantity
                })
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.details || responseData.error || 'Sepet güncellenemedi');
            }

            // Sepeti yeniden yükle
            await sepetVerileriniGetir();
        } catch (error) {
            console.error('Sepet güncelleme hatası:', error);
            Alert.alert(
                'Hata', 
                `Sepet güncellenirken bir sorun oluştu: ${error.message}`,
                [{ text: 'Tamam' }]
            );
        }
    };

    const arttirAdet = (id) => {
        const urun = sepet.find(u => u.id === id);
        if (urun) {
            updateCartItemQuantity(id, urun.adet + 1);
        }
    };

    const azaltAdet = (id) => {
        const urun = sepet.find(u => u.id === id);
        if (urun && urun.adet > 1) {
            updateCartItemQuantity(id, urun.adet - 1);
        }
    };

    const urunuSepettenKaldir = async (id) => {
        try {
            if (!isLoggedIn) {
                Alert.alert('Giriş Yapın', 'Bu işlemi yapmak için lütfen giriş yapın');
                return;
            }
            
            setYukleniyor(true);

            const response = await fetch(`${API_URL}/api/products/cart/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Ürün sepetten kaldırılamadı. HTTP Kodu: ${response.status}`);
            }

            const guncelSepet = sepet.filter(urun => urun.id !== id);
            setSepet(guncelSepet);
            
            Alert.alert(
                'Başarılı',
                'Ürün sepetten kaldırıldı',
                [{ text: 'Tamam' }]
            );
        } catch (error) {
            console.error('Ürün sepetten kaldırılırken hata oluştu:', error);
            Alert.alert(
                'Hata',
                `Ürün sepetten kaldırılırken bir sorun oluştu: ${error.message}`,
                [{ text: 'Tamam' }]
            );
        } finally {
            setYukleniyor(false);
        }
    };

    const handlePayButton = () => {
        if (!isLoggedIn) {
            Alert.alert(
                'Giriş Yapın',
                'Ödeme yapmak için lütfen giriş yapın',
                [
                    { text: 'Giriş Yap', onPress: () => navigation.navigate('Login') },
                    { text: 'İptal', style: 'cancel' }
                ]
            );
            return;
        }
        
        navigation.navigate('OdemeYap');
    };

    if (yukleniyor && sepet.length === 0) {
        return (
            <View style={styles.yuklemeContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={styles.yuklemeText}>Sepet yükleniyor...</Text>
                <BottomTabBar />
            </View>
        );
    }

    if (sepet.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.ustOdemeBar}>
                    <Text style={styles.ustOdemeBarBaslik}></Text>
                </View>
                <View style={styles.bosSepetContainer}>
                    <Text style={styles.bosSepetText}>Sepetinizde ürün bulunmamaktadır.</Text>
                    <TouchableOpacity 
                        style={styles.alisveriseDevamButon}
                        onPress={() => navigation.navigate('Main')}
                    >
                        <Text style={styles.alisveriseDevamText}>Alışverişe Devam Et</Text>
                    </TouchableOpacity>
                </View>
                <BottomTabBar />
            </View>
        );
    }

    const toplamFiyat = sepet.reduce((total, urun) => 
    total + (urun.fiyat * urun.adet), 0
        ).toFixed(2);

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor="#f8f8f8" barStyle="dark-content" />
            
            <View style={styles.ustOdemeBar}>
                <Text style={styles.ustOdemeBarBaslik}></Text>
            </View>
    
            {yukleniyor && (
                <View style={styles.overlaySpin}>
                    <ActivityIndicator size="large" color="#007bff" />
                </View>
            )}
    
            {/* Ürünlerin olduğu bölüm - ScrollView ile */}
            <ScrollView 
                style={styles.urunlerContainer} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
            >
                {sepet.map((urun) => (
                    <View key={urun.id} style={styles.urunKarti}>
                        <Image 
                            source={{ 
                                uri: (() => {
                                    if (!urun.resim) {
                                        return 'https://www.shutterstock.com/image-photo/background-food-dishes-european-cuisine-260nw-2490284951.jpg';
                                    }
                                    if (urun.resim.startsWith('http')) {
                                        return urun.resim;
                                    }
                                    const normalizedUrl = urun.resim.startsWith('/') 
                                        ? urun.resim 
                                        : `/${urun.resim}`;
                                    return `${API_URL}${normalizedUrl}`;
                                })()
                            }} 
                            style={styles.urunResmi}
                            onError={(error) => {
                                // 404 hatalarını sessizce handle et (resim bulunamadı)
                                const errorCode = error.nativeEvent?.error?.code;
                                if (errorCode && errorCode !== 404) {
                                    console.warn('Sepet resim yükleme hatası:', {
                                        url: urun.resim,
                                        code: errorCode
                                    });
                                }
                            }}
                        />
                        <View style={styles.urunBilgileri}>
                            <Text style={styles.urunAdi}>{urun.ad}</Text>
                            <Text style={styles.urunBoyut}>{urun.boyut}</Text>
                            
                            <View style={styles.adetContainer}>
                                <TouchableOpacity 
                                    style={styles.adetButon}
                                    onPress={() => azaltAdet(urun.id)}
                                    disabled={urun.adet <= 1}
                                >
                                    <Text style={styles.adetButonText}>-</Text>
                                </TouchableOpacity>

                                <Text style={styles.adetText}>{urun.adet}</Text>

                                <TouchableOpacity 
                                    style={styles.adetButon}
                                    onPress={() => arttirAdet(urun.id)}
                                >
                                    <Text style={styles.adetButonText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        <View style={styles.fiyatContainer}>
                            <Text style={styles.fiyatText}>
                                {(urun.fiyat * urun.adet).toFixed(2)} TL
                            </Text>
                            <TouchableOpacity 
                                onPress={() => urunuSepettenKaldir(urun.id)}
                                disabled={yukleniyor}
                                style={styles.silButon}
                            >
                                <Text style={styles.silButonText}>Sil</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
                
                {/* Alttaki ödeme alanı ve TabBar için boşluk */}
                <View style={styles.paddingBottom} />
            </ScrollView>
    
            {/* Ödeme Yapma Alanı - Daha yüksek pozisyonda */}
            <View style={styles.altContainer}>
                <View style={styles.toplamContainer}>
                    <Text style={styles.toplamBaslik}>Toplam</Text>
                    <Text style={styles.toplamFiyat}>{toplamFiyat} TL</Text>
                </View>
                <TouchableOpacity 
                    style={styles.odemeButon}
                    onPress={handlePayButton}
                    disabled={yukleniyor || sepet.length === 0}
                >
                    <Text style={styles.odemeButonText}>Ödeme Yap</Text>
                </TouchableOpacity>
            </View>
            
            {/* TabBar bileşeni kendi absolute pozisyonunu kullanıyor */}
            <BottomTabBar />
        </View>
    );
}
    
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f8f8',
        position: 'relative',
    },
    yuklemeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
    },
    yuklemeText: {
        marginTop: 12,
        marginBottom: 100, // BottomTabBar için boşluk
        fontSize: 16,
        color: '#666',
    },
    hataContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f8f8',
    },
    hataText: {
        fontSize: 16,
        color: '#d32f2f',
        textAlign: 'center',
        marginBottom: 20,
    },
    yenidenDeneButton: {
        backgroundColor: '#FF6B00',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        shadowColor: "#FF6B00",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 3.84,
        elevation: 3,
    },
    yenidenDeneButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    bosSepetContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f8f8',
        paddingBottom: 120, // TabBar için alt boşluk
    },
    bosSepetText: {
        fontSize: 18,
        color: '#666',
        marginBottom: 30,
        textAlign: 'center',
    },
    alisveriseDevamButon: {
        backgroundColor: '#FF6B00',
        paddingHorizontal: 25,
        paddingVertical: 14,
        borderRadius: 25,
        shadowColor: "#FF6B00",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 3.84,
        elevation: 3,
    },
    alisveriseDevamText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    ustOdemeBar: {
        padding: 15,
        backgroundColor: 'white',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    ustOdemeBarBaslik: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    urunlerContainer: {
        flex: 1,
        width: '100%', // Tam genişlik
    },
    scrollContent: {
        padding: 10,
        paddingBottom: BOTTOM_TAB_HEIGHT + PAYMENT_AREA_HEIGHT + 30, // TabBar + Ödeme alanı için daha fazla boşluk
    },
    paddingBottom: {
        height: BOTTOM_TAB_HEIGHT + PAYMENT_AREA_HEIGHT + 30, // TabBar + Ödeme alanı için ek boşluk
    },
    urunKarti: {
        flexDirection: 'row',
        padding: 15,
        marginVertical: 8,
        marginHorizontal: 5,
        backgroundColor: 'white',
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
        alignItems: 'center',
        height: 140, // Sabit yükseklik
    },
    urunResmi: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 15
    },
    urunBilgileri: {
        flex: 1,
        justifyContent: 'space-between',
        height: '100%',
        paddingVertical: 5,
    },
    urunAdi: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    urunBoyut: {
        fontSize: 14,
        color: '#555',
        marginBottom: 6,
    },
    adetContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    adetButon: {
        backgroundColor: '#f5f5f5',
        padding: 0,
        borderRadius: 20,
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#eee',
    },
    adetButonText: {
        fontSize: 18,
        color: '#333',
    },
    adetText: {
        marginHorizontal: 12,
        fontSize: 16,
        color: '#333',
    },
    fiyatContainer: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: '100%',
        paddingVertical: 10,
        width: 80, // Sabit genişlik fiyat kısmı için
    },
    fiyatText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF6B00',
        marginBottom: 10
    },
    silButon: {
        backgroundColor: '#f5f5f5',
        padding: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#eee',
    },
    silButonText: {
        color: '#FF4136',
        fontSize: 13,
        fontWeight: '500',
    },
    altContainer: {
        position: 'absolute',
        bottom: BOTTOM_TAB_HEIGHT + 20, // TabBar yüksekliği + daha fazla boşluk
        left: 0,
        right: 0,
        padding: 15,
        paddingTop: 25, // İçeriği daha yukarı taşımak için üst padding arttırıldı
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -3,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 90, // TabBar'dan düşük (TabBar zIndex: 999)
        height: PAYMENT_AREA_HEIGHT, // Yükseklik arttırıldı
    },
    toplamContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        paddingVertical: 5,
    },
    toplamBaslik: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    toplamFiyat: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FF6B00'
    },
    odemeButon: {
        backgroundColor: '#FF6B00',
        padding: 15,
        borderRadius: 25,
        alignItems: 'center',
        shadowColor: "#FF6B00",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 3.84,
        elevation: 3,
    },
    odemeButonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
    overlaySpin: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    }
});
    
export default UserAddToCardScreen;
