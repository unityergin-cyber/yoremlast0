import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    StyleSheet, 
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useKullanici } from '../context/KullaniciContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../src/config/api';
import BottomTabBar from '../components/BottomTabBar';
import moment from 'moment';
import { useFocusEffect } from '@react-navigation/native';

function UserPaymentScreen(props) {
    // Mevcut context hook'larını genişletin
    const { 
        userToken, 
        sepetUrunleri, 
        setSepetUrunleri, 
        isLoggedIn
    } = useKullanici();

    // Ekran yüklendiğinde oturum kontrolü yapan bir useEffect
    useEffect(() => {
        console.log("Ödeme ekranı açıldı, login durumu:", isLoggedIn);
        
        // Doğrudan context'teki isLoggedIn değerini kontrol et
        if (!isLoggedIn) {
            Alert.alert(
                'Giriş Yapın',
                'Ödeme yapmak için lütfen giriş yapın',
                [
                    { 
                        text: 'Giriş Yap', 
                        onPress: () => props.navigation.navigate('Login') 
                    },
                    { 
                        text: 'İptal', 
                        onPress: () => props.navigation.goBack(),
                        style: 'cancel' 
                    }
                ]
            );
        }
    }, [isLoggedIn]);
 
    // State'ler
    const [odemeYontemi, setOdemeYontemi] = useState('cash');
    const [not, setNot] = useState('');
    const [notEkleAktif, setNotEkleAktif] = useState(false);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [adresler, setAdresler] = useState([]);
    const [seciliAdresId, setSeciliAdresId] = useState(null);
    const [hata, setHata] = useState(null);
    const [toplamFiyat, setToplamFiyat] = useState();

    // useFocusEffect kullanarak ekran her odaklandığında adresleri yeniden yükle
    useFocusEffect(
        React.useCallback(() => {
            console.log("Ekran odaklandı, adres bilgileri yenileniyor... isLoggedIn:", isLoggedIn);
            
            // Login durumunu yeniden kontrol et
            if (!isLoggedIn) {
                return; // Login yoksa işlemi iptal et
            }
            
            adresBilgileriniGetir();
            // Toplam fiyatı da yenile
            toplamHesapla();
            
            return () => {
                // Temizleme işlemleri gerekirse burada yapabilirsiniz
                console.log("Ekran odaktan çıktı");
            };
        }, [isLoggedIn])
    );

    // Ürün seçeneklerini parse edip fiyat ayarlamalarını topla
    const parseOptionsAndPrice = (options) => {
        const result = {
            parsed: null,
            rawString: "",
            price: 0
        };

        if (!options) return result;

        const raw = typeof options === "string" ? options.trim() : options;
        if (typeof raw === "string") {
            result.rawString = raw;
        }

        if (typeof raw === "string" && raw) {
            const looksComplete =
                (raw.startsWith("[") && raw.endsWith("]")) ||
                (raw.startsWith("{") && raw.endsWith("}"));
            if (looksComplete) {
                try {
                    result.parsed = JSON.parse(raw);
                } catch (e) {
                    console.warn("Options parse failed:", e);
                }
            }
        } else if (Array.isArray(raw) || typeof raw === "object") {
            result.parsed = raw;
        }

        const addAdjustments = (vals = []) => {
            vals.forEach(val => {
                const mod = val?.price_adjustment ?? val?.priceModifier ?? val?.price_modifier;
                if (mod !== undefined && mod !== null) {
                    const adj = parseFloat(mod);
                    if (!isNaN(adj)) result.price += adj;
                }
            });
        };

        if (Array.isArray(result.parsed)) {
            result.parsed.forEach(option => {
                if (option && Array.isArray(option.values)) addAdjustments(option.values);
            });
        } else if (result.parsed && typeof result.parsed === "object") {
            Object.values(result.parsed).forEach(option => {
                if (option && Array.isArray(option.values)) addAdjustments(option.values);
            });
        }

        if (result.price === 0 && typeof raw === "string") {
            const regex = /"price(?:_)?(?:adjustment|modifier)"\s*:\s*(-?\d+(?:\.\d+)?)/gi;
            let match;
            while ((match = regex.exec(raw)) !== null) {
                const adj = parseFloat(match[1]);
                if (!isNaN(adj)) result.price += adj;
            }
        }

        return result;
    };

    const adresBilgileriniGetir = async () => {
        setYukleniyor(true);
        setHata(null);
        try {
            if (!isLoggedIn || !userToken) {
                throw new Error('Oturum açık değil');
            }
            
            console.log("Adres bilgileri getiriliyor... Token:", userToken ? "VAR" : "YOK");
            
            const response = await fetch(`${API_URL}/api/addresses`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log("Adres API response status:", response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.log("Adres API error response:", errorText);
                throw new Error(`Adresler alınamadı (${response.status})`);
            }
            
            const responseData = await response.json();
            console.log("Adres API response data:", JSON.stringify(responseData).substring(0, 100) + "...");
            
            if (responseData.addresses && Array.isArray(responseData.addresses)) {
                setAdresler(responseData.addresses);
                
                // Varsayılan adres var mı kontrol et
                const varsayilanAdres = responseData.addresses.find(adres => adres.is_default === 1);
                if (varsayilanAdres) {
                    setSeciliAdresId(varsayilanAdres.id);
                } else if (responseData.addresses.length > 0) {
                    // Varsayılan yoksa ilk adresi seç
                    setSeciliAdresId(responseData.addresses[0].id);
                }
            } else {
                console.log("Adres bulunamadı veya format uygun değil");
                setAdresler([]);
            }
        } catch (error) {
            console.error("Adres bilgileri getirme hatası:", error);
            setHata(error.message);
        } finally {
            setYukleniyor(false);
        }
    };
    
    // Toplam sipariş tutarı hesapla
  // Toplam sipariş tutarı hesapla
const hesaplaToplam = async () => {
    try {
        if (!isLoggedIn || !userToken) {
            console.log("Toplam hesaplama: Oturum açık değil");
            return "0.00";
        }

        console.log("Sepet toplam hesaplaması... Token:", userToken ? "VAR" : "YOK");
        
        // Sepet ürünlerini API'den çek
        const response = await fetch(`${API_URL}/api/products/cart`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error("Sepet getirme hatası:", response.status);
            return "0.00";
        }
        
        const responseData = await response.json();
        
        // Sepet boşsa
        if (!responseData.cart || responseData.cart.length === 0) {
            console.log("Sepet boş");
            return "0.00";
        }
        
        // ✅ DÜZELTME: Backend'den gelen base_price zaten seçenek dahil
        const toplam = responseData.cart.reduce((toplam, urun) => {
            const birimFiyat = parseFloat(urun.base_price || urun.unit_price || urun.price || 0);
            const adet = urun.quantity || 1;
            const itemTotal = birimFiyat * adet;
            
            console.log(`Ürün: ${urun.name}, Birim Fiyat (Seçenek Dahil): ${birimFiyat}, Adet: ${adet}, Ara Toplam: ${itemTotal}`);
            
            return toplam + itemTotal;
        }, 0);
        
        const sonuc = toplam.toFixed(2);
        console.log(`Hesaplanan toplam: ${sonuc}`);
        
        return sonuc;
    } catch (error) {
        console.error("Toplam hesaplama hatası:", error);
        return "0.00";
    }
};

    // Toplamı hesaplayan fonksiyon
    const toplamHesapla = async () => {
        const toplam = await hesaplaToplam();
        setToplamFiyat(toplam);
    };
    
    // handleSiparisTamamlaButton fonksiyonunu güncelleyin

// handleSiparisTamamlaButton fonksiyonunu güncelleyin

const handleSiparisTamamlaButton = async () => {
  if (!isLoggedIn) {
    Alert.alert('Giriş Yapın', 'Ödeme yapmak için lütfen giriş yapın');
    return;
  }
  
  try {
    setYukleniyor(true);
    
    // 1. Çalışma saatleri kontrolü
    console.log("Sipariş öncesi çalışma saatleri kontrol ediliyor...");
    const workingHoursResponse = await fetch(`${API_URL}/api/restaurant-hours/check`);
    const workingHoursData = await workingHoursResponse.json();
    
    if (!workingHoursResponse.ok) {
      throw new Error("Çalışma saatleri kontrol edilemedi. Lütfen daha sonra tekrar deneyin.");
    }
    
    if (!workingHoursData.is_open) {
      setYukleniyor(false);
      Alert.alert(
        'Çalışma Saatleri Dışında',
        'Üzgünüz, şu anda çalışma saatleri dışındayız ve sipariş alamıyoruz.\n\n' +
        'Çalışma saatleri içinde tekrar deneyiniz.',
        [
          {
            text: 'Anladım',
            onPress: () => {
              props.navigation.navigate('Main');
            }
          }
        ]
      );
      return;
    }
    
    // 2. Seçili adresi kontrol et
    if (!seciliAdresId) {
      setYukleniyor(false);
      Alert.alert('Hata', 'Lütfen bir teslimat adresi seçin.');
      return;
    }
    
    // 3. Seçili adres bilgilerini al
    const seciliAdres = adresler.find(adres => adres.id === seciliAdresId);
    if (!seciliAdres) {
      setYukleniyor(false);
      Alert.alert('Hata', 'Seçili adres bulunamadı.');
      return;
    }
    
    console.log("Seçili adres:", seciliAdres);
    
    // 4. Mahalle minimum sipariş tutarını kontrol et
    const guncelToplamStr = await hesaplaToplam();
    const sepetToplami = parseFloat(guncelToplamStr || '0');
    const mahalleMinTutar = parseFloat(seciliAdres.min_order_amount || seciliAdres.minimum_order_amount ||  0);
    
    console.log("Mahalle minimum tutarı:", mahalleMinTutar);
    console.log("Sepet toplamı:", sepetToplami);
    
    // Minimum tutardan düşükse uyarı ver
    if (mahalleMinTutar > 0 && sepetToplami < mahalleMinTutar) {
      setYukleniyor(false);
      Alert.alert(
        'Minimum Sipariş Tutarı',
        `${seciliAdres.neighborhood} mahallesi için minimum sipariş tutarı ${mahalleMinTutar.toFixed(2)} TL'dir.\n\n` +
        `Sepet toplamınız: ${sepetToplami.toFixed(2)} TL\n\n` +
        `Lütfen sepetinize en az ${(mahalleMinTutar - sepetToplami).toFixed(2)} TL daha ürün ekleyiniz.`,
        [
          {
            text: 'Alışverişe Devam Et',
            onPress: () => {
              props.navigation.navigate('Main');
            }
          },
          {
            text: 'Tamam',
            style: 'cancel'
          }
        ]
      );
      return;
    }
    
    console.log("Minimum tutar kontrolü geçildi, sipariş oluşturuluyor...");
    
    // 5. Sepetteki ürünlerin seçeneklerini getir
    const cartResponse = await fetch(`${API_URL}/api/products/cart`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!cartResponse.ok) {
      throw new Error("Sepet bilgileri alınamadı");
    }
    
    const cartData = await cartResponse.json();
    
    // Sepetteki ürünlerin seçeneklerinden not oluştur
    let secilenUrunlerNotu = "";
    
    console.log("Sepet verileri:", JSON.stringify(cartData).substring(0, 500));
    
    if (cartData && cartData.cart && Array.isArray(cartData.cart)) {
      let tumSecenekler = [];
      
      cartData.cart.forEach((item) => {
        console.log(`Ürün: ${item.name}, Options:`, item.options);
        
        if (item.options) {
          try {
            let parsedOptions = null;
            
            if (typeof item.options === 'string') {
              console.log("Ham options verisi:", item.options);
              
              try {
                parsedOptions = JSON.parse(item.options);
              } catch (parseError) {
                console.log("JSON parse hatası:", parseError.message);
                
                const valueRegex = /"value":"([^"]+)"/g;
                let match;
                while ((match = valueRegex.exec(item.options)) !== null) {
                  const value = match[1].trim();
                  if (value && !tumSecenekler.includes(value)) {
                    tumSecenekler.push(value);
                  }
                }
                
                return;
              }
            } else {
              parsedOptions = item.options;
            }
            
            if (Array.isArray(parsedOptions)) {
              parsedOptions.forEach(option => {
                if (option && option.values && Array.isArray(option.values)) {
                  option.values.forEach(val => {
                    if (val && val.value) {
                      const value = val.value.trim();
                      if (value && !tumSecenekler.includes(value)) {
                        tumSecenekler.push(value);
                      }
                    }
                  });
                }
              });
            } else if (parsedOptions && typeof parsedOptions === 'object') {
              for (const key in parsedOptions) {
                const option = parsedOptions[key];
                
                if (option && Array.isArray(option.values)) {
                  option.values.forEach(val => {
                    if (val && val.value) {
                      const value = val.value.trim();
                      if (value && !tumSecenekler.includes(value)) {
                        tumSecenekler.push(value);
                      }
                    }
                  });
                } else if (option && option.value) {
                  const value = option.value.trim();
                  if (value && !tumSecenekler.includes(value)) {
                    tumSecenekler.push(value);
                  }
                }
              }
            }
          } catch (e) {
            console.log("Seçenek işleme hatası:", e.message);
          }
        }
      });
      
      if (tumSecenekler.length > 0) {
        secilenUrunlerNotu = tumSecenekler.join(",");
        
        if (secilenUrunlerNotu.length > 200) {
          secilenUrunlerNotu = secilenUrunlerNotu.substring(0, 197) + "...";
        }
        
        console.log("Eklenen tüm seçenekler (kısaltılmış):", secilenUrunlerNotu);
      }
    }
    
    // Kullanıcı notunu ve ürün notlarını birleştir
    let fullNote = secilenUrunlerNotu;
    if (not && not.trim()) {
      if (fullNote) {
        const kalanKarakter = 250 - fullNote.length;
        if (kalanKarakter > 10) {
          let userNote = not.trim();
          if (userNote.length > kalanKarakter) {
            userNote = userNote.substring(0, kalanKarakter - 3) + "...";
          }
          fullNote += " | " + userNote;
        }
      } else {
        let userNote = not.trim();
        if (userNote.length > 250) {
          userNote = userNote.substring(0, 247) + "...";
        }
        fullNote = userNote;
      }
    }
    
    console.log("Son not içeriği:", fullNote, "Uzunluk:", fullNote.length);
    
    fullNote = fullNote.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    if (fullNote.length > 2000) {
      console.log(`DİKKAT: Not çok uzun (${fullNote.length} karakter). Kısaltılıyor...`);
      fullNote = fullNote.substring(0, 1990) + "...";
    }
    
    console.log("Temizlenmiş not:", fullNote);
    console.log("Not uzunluğu:", fullNote.length);
    
    console.log("Sipariş POST isteği başlıyor...");
    console.log("İstek URL:", `${API_URL}/api/orders`);
    
    const orderRequest = {
      address_id: seciliAdresId,
      payment_type: odemeYontemi,
      note: fullNote
    };
    
    console.log("İstek body:", JSON.stringify(orderRequest));
    
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderRequest)
    });
    
    console.log("POST yanıtı alındı:", response.status, "OK:", response.ok);
    
    const responseText = await response.text();
    console.log("POST yanıt metni:", responseText);
    console.log("Response status:", response.status);
    console.log("Response headers:", JSON.stringify(response.headers));
    
    try {
      const responseData = JSON.parse(responseText);
      console.log("JSON parse edildi:", JSON.stringify(responseData, null, 2));
      
      if (response.ok) {
        console.log("İşlem başarılı, sepet temizleniyor");
        setSepetUrunleri([]);
        
        props.navigation.navigate('SiparisTamamla', {
          islemDurumu: 'basarili',
          siparisDetaylari: {
            siparisId: responseData.order_id,
            toplamTutar: responseData.total_amount,
            odemeYontemi: odemeYontemi,
            adres: seciliAdres ? `${seciliAdres.neighborhood}, ${seciliAdres.street}, ${seciliAdres.address_detail}` : '',
            siparisTarihi: moment().format('DD.MM.YYYY')
          }
        });
      } else {
        // Detaylı hata logları
        console.log("=== HATA DETAYLARI ===");
        console.log("Response Data:", responseData);
        console.log("Error:", responseData.error);
        console.log("Message:", responseData.message);
        console.log("Full Error Message:", responseData.fullErrorMessage);
        console.log("Error Stack:", responseData.errorStack);
        console.log("Status:", responseData.status);
        console.log("=====================");
        
        // Hata mesajını belirle
        let hataMesaji = responseData.error 
          || responseData.message 
          || responseData.fullErrorMessage
          || 'Sipariş oluşturulurken bir hata oluştu';
        
        // Backend'den gelen hata mesajını logla
        console.log("Kullanıcıya gösterilecek hata:", hataMesaji);
        
        props.navigation.navigate('SiparisTamamla', {
          islemDurumu: 'basarisiz'
        });
        
        Alert.alert(
          'Sipariş Hatası',
          hataMesaji,
          [{ text: 'Tamam' }]
        );
      }
    } catch (parseError) {
      console.error("JSON parse hatası:", parseError.message);
      console.error("Ham yanıt:", responseText);
      
      props.navigation.navigate('SiparisTamamla', {
        islemDurumu: 'basarisiz'
      });
      
      Alert.alert(
        'Yanıt Hatası',
        'Sunucu yanıtı işlenemedi. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }]
      );
    }
  } catch (error) {
    console.error("Fetch hatası:", error.message);
    
    props.navigation.navigate('SiparisTamamla', {
      islemDurumu: 'basarisiz'
    });
    
    Alert.alert(
      'Bağlantı Hatası',
      'Sunucuya bağlanırken bir sorun oluştu. Lütfen internet bağlantınızı kontrol edin.',
      [{ text: 'Tamam' }]
    );
  } finally {
    setYukleniyor(false);
    console.log("İşlem tamamlandı, yükleniyor durumu kapatıldı");
  }
};


    // Seçili adresi bul
    const getSeciliAdres = () => {
        if (!seciliAdresId || adresler.length === 0) return null;
        return adresler.find(adres => adres.id === seciliAdresId);
    };
    
    const seciliAdres = getSeciliAdres();
    
    // Yükleniyor durumunda
    if (yukleniyor && adresler.length === 0) {
        return (
            <View style={styles.yuklemeContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={styles.yuklemeText}>Bilgiler yükleniyor...</Text>
            </View>
        );
    }
    
    return (
        <View style={styles.mainContainer}>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                {/* İlerleme Göstergesi */}
                <View style={styles.ilerlemeBari}>
                    <View style={styles.ilerlemeAdimlari}>
                        <Text style={styles.ilerlemeTextPasif}>SEPETİM</Text>
                    </View>
                    <View style={[styles.ilerlemeAdimlari, styles.aktifAdim]}>
                        <Text style={styles.ilerlemeTextAktif}>ONAY</Text>
                    </View>
                    <View style={styles.ilerlemeAdimlari}>
                        <Text style={styles.ilerlemeTextPasif}>SONUÇ</Text>
                    </View>
                </View>
                
                {/* Adres Bilgisi */}
                <View style={styles.adresContainer}>
                    <Text style={styles.baslik}>Teslimat Adresi</Text>
                    
                    {hata && (
                        <Text style={styles.hataText}>
                            {hata}
                        </Text>
                    )}
                    
                    {seciliAdres ? (
                        <>
                            <Text style={styles.adresBilgisi}>
                                {seciliAdres.title}
                            </Text>
                            <Text style={styles.adresDetay}>
                                {seciliAdres.neighborhood}, {seciliAdres.street}
                            </Text>
                            <Text style={styles.adresTarifi}>
                                {seciliAdres.city}/{seciliAdres.district} - {seciliAdres.address_detail || ''}
                            </Text>
                        </>
                    ) : (
                        <Text style={styles.bosAdresText}>
                            {adresler.length === 0 
                                ? "Henüz kayıtlı adresiniz bulunmamaktadır." 
                                : "Lütfen bir adres seçiniz."}
                        </Text>
                    )}
                    
                    <TouchableOpacity 
    style={styles.adresDegistirButon}
    onPress={() => props.navigation.navigate(
        adresler.length === 0 ? 'YeniAdres' : 'Adreslerim', 
        adresler.length === 0 ? { returnToPayment: true } : {}
    )}
>
    <Text style={styles.adresDegistirText}>
        {adresler.length === 0 ? "Adres Ekle" : "Adresi Değiştir"}
    </Text>
</TouchableOpacity>
                </View>
                
                {/* Ödeme Seçenekleri */}
                <View style={styles.odemeContainer}>
                    <Text style={styles.baslik}>Ödeme Seçenekleri</Text>
                    
                    <TouchableOpacity 
                        style={[styles.odemeSecenegi, odemeYontemi === 'cash' && styles.seciliOdeme]}
                        onPress={() => setOdemeYontemi('cash')}
                    >
                        <Text style={styles.odemeSecenek}>Kapıda Nakit Ödeme</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.odemeSecenegi, odemeYontemi === 'credit_card' && styles.seciliOdeme]}
                        onPress={() => setOdemeYontemi('credit_card')}
                    >
                        <Text style={styles.odemeSecenek}>Kapıda Kredi Kartı ile Ödeme</Text>
                    </TouchableOpacity>
                </View>
                
                {/* Not Ekleme */}
                <View style={styles.notContainer}>
                    <Text style={styles.baslik}>Sipariş Notu</Text>
                    
                    {notEkleAktif ? (
                        <>
                            <TextInput
                                style={styles.notInput}
                                placeholder="Siparişiniz için not ekleyin..."
                                multiline={true}
                                value={not}
                                onChangeText={(text) => setNot(text)}
                            />
                            <TouchableOpacity 
                                style={styles.notKapatButon}
                                onPress={() => setNotEkleAktif(false)}
                            >
                                <Text style={styles.notKapatText}>Kapat</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity 
                            style={styles.notEkleButon}
                            onPress={() => setNotEkleAktif(true)}
                        >
                            <Text style={styles.notEkleText}>Not Ekle</Text>
                        </TouchableOpacity>
                    )}
                </View>
                
                {/* Alt Kısım - Toplam ve Tamamla Butonu */}
                <View style={styles.altContainer}>
                    <View style={styles.toplamFiyatContainer}>
                        <Text style={styles.toplamFiyatText}>{toplamFiyat} TL</Text>
                    </View>
                    
                    <TouchableOpacity 
                        style={[
                            styles.siparisTamamlaButon,
                            (!seciliAdres || yukleniyor || !isLoggedIn) && styles.disabledButton
                        ]}
                        onPress={handleSiparisTamamlaButton}
                        disabled={!seciliAdres || yukleniyor || !isLoggedIn}
                    >
                        <Text style={styles.siparisTamamlaText}>
                            {yukleniyor ? "İŞLENİYOR..." : "SİPARİŞİ TAMAMLA"}
                        </Text>
                    </TouchableOpacity>
                </View>
                
                {/* Tab bar için boşluk bırak */}
                <View style={styles.tabBarSpacer} />
            </ScrollView>
            
            {yukleniyor && (
                <View style={styles.overlaySpin}>
                    <ActivityIndicator size="large" color="#007bff" />
                </View>
            )}
            
            <View style={styles.tabBarContainer}>
                <BottomTabBar />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#f8f8f8',
        position: 'relative',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 80,
    },
    yuklemeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    yuklemeText: {
        marginTop: '3%',
        fontSize: 16,
        color: '#666',
    },
    overlaySpin: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    ilerlemeBari: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: '4%',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    ilerlemeAdimlari: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
    },
    aktifAdim: {
        borderWidth: 2,
        borderColor: '#FF6B00', // Turuncu tema rengi
        borderRadius: 5,
    },
    ilerlemeTextAktif: {
        fontWeight: 'bold',
        color: '#FF6B00', // Turuncu tema rengi
    },
    ilerlemeTextPasif: {
        color: '#666',
    },
    baslik: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: '3%',
        color: '#333',
    },
    adresContainer: {
        backgroundColor: '#fff',
        padding: '4%',
        marginVertical: '2%',
        borderRadius: 10, // Daha yuvarlak
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    adresBilgisi: {
        fontSize: 16,
        marginBottom: '1.5%',
        fontWeight: 'bold',
        color: '#333',
    },
    adresDetay: {
        fontSize: 15,
        marginBottom: '1.5%',
        color: '#555',
    },
    adresTarifi: {
        color: '#666',
        marginBottom: '3%',
    },
    bosAdresText: {
        color: '#FF3B30', // Daha modern bir hata rengi
        marginBottom: '3%',
    },
    hataText: {
        color: '#FF3B30', // Daha modern bir hata rengi
        marginBottom: '4%',
    },
    adresDegistirButon: {
        alignSelf: 'flex-end',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#FF6B00', // Turuncu tema rengi
        borderRadius: 20, // Daha yuvarlak
    },
    adresDegistirText: {
        color: '#FF6B00', // Turuncu tema rengi
        fontWeight: '500',
    },
    odemeContainer: {
        backgroundColor: '#fff',
        padding: '4%',
        marginVertical: '2%',
        borderRadius: 10, // Daha yuvarlak
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    odemeSecenegi: {
        padding: '4%',
        marginVertical: '1.5%',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10, // Daha yuvarlak
    },
    seciliOdeme: {
        borderColor: '#FF6B00', // Turuncu tema rengi
        backgroundColor: '#FFF8F5', // Çok açık turuncu tonu
    },
    odemeSecenek: {
        fontSize: 15,
        color: '#444',
    },
    notContainer: {
        backgroundColor: '#fff',
        padding: '4%',
        marginVertical: '2%',
        borderRadius: 10, // Daha yuvarlak
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    notEkleButon: {
        padding: 10,
        backgroundColor: '#f5f5f5',
        borderRadius: 10, // Daha yuvarlak
        alignItems: 'center',
    },
    notEkleText: {
        color: '#666',
    },
    notInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10, // Daha yuvarlak
        padding: 10,
        minHeight: 100,
        textAlignVertical: 'top',
        backgroundColor: '#fff',
    },
    notKapatButon: {
        alignSelf: 'flex-end',
        paddingVertical: 8,
        paddingHorizontal: 15,
        marginTop: '1.5%',
    },
    notKapatText: {
        color: '#666',
    },
    altContainer: {
        backgroundColor: '#fff',
        padding: '4%',
        marginVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        borderRadius: 10, // Daha yuvarlak alt kısım
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    toplamFiyatContainer: {
        flex: 1,
    },
    toplamFiyatText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF6B00', // Turuncu tema rengi
    },
    siparisTamamlaButon: {
        backgroundColor: '#FF6B00', // Turuncu tema rengi
        padding: 15,
        borderRadius: 25, // Daha yuvarlak buton
        paddingHorizontal: 20,
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
        backgroundColor: '#cccccc',
        shadowOpacity: 0.1,
    },
    siparisTamamlaText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    tabBarSpacer: {
        height: 60, // BottomTabBar'ın yüksekliği
    },
    tabBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100
    }
});

export default UserPaymentScreen;
