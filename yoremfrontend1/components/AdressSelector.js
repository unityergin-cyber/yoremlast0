import React, { useEffect, useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, ActivityIndicator, Platform,TouchableOpacity } from 'react-native';
import { API_URL } from '../src/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

function AdresSelector({ adresBilgileri, onAdresChange }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Bölge verileri
    const [cities, setCities] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [neighborhoods, setNeighborhoods] = useState([]);
    const [streets, setStreets] = useState([]);
    
    // Form alanları
    const [title, setTitle] = useState(adresBilgileri?.title || '');
    const [selectedCity, setSelectedCity] = useState(adresBilgileri?.city || '');
    const [selectedDistrict, setSelectedDistrict] = useState(adresBilgileri?.district || '');
    const [selectedNeighborhood, setSelectedNeighborhood] = useState(adresBilgileri?.neighborhood || '');
    const [selectedStreet, setSelectedStreet] = useState(adresBilgileri?.street || '');
    const [addressDetail, setAddressDetail] = useState(adresBilgileri?.address_detail || '');
    const [isDefault, setIsDefault] = useState(adresBilgileri?.is_default === 1 || false);


    // Adres tarifi için eklendi 18.11.2025:
    const [addressDescription, setAddressDescription] = useState(adresBilgileri?.address_description || '');
    const [isDescriptionEnabled, setIsDescriptionEnabled] = useState(false);
    const [descriptionActive, setDescriptionActive] = useState(false);

    // Form dokunulmuşluk durumları
    const [touched, setTouched] = useState({
        title: false,
        city: false,
        district: false,
        neighborhood: false,
        street: false,
        addressDetail: false
    });

    // Hata mesajları için state'ler
    const [errors, setErrors] = useState({
        title: false,
        city: false,
        district: false,
        neighborhood: false,
        street: false,
        addressDetail: false
    });

    // Bölge ve adres verilerini getir
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');
                const response = await fetch(`${API_URL}/api/addresses/regions`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const responseData = await response.json();

                if (responseData.status === "success") {
                    // Veri yapısını işle
                    const cityList = Object.keys(responseData.data);
                    setCities(cityList);
                    
                    // Eğer önceden seçilmiş bir şehir varsa, onun ilçelerini de yükle
                    if (selectedCity && responseData.data[selectedCity]) {
                        const districtList = Object.keys(responseData.data[selectedCity]);
                        setDistricts(districtList);
                        
                        // Eğer önceden seçilmiş bir ilçe varsa, onun mahallelerini de yükle
                        if (selectedDistrict && responseData.data[selectedCity][selectedDistrict]) {
                            const neighborhoodList = Object.keys(responseData.data[selectedCity][selectedDistrict]);
                            setNeighborhoods(neighborhoodList);
                            
                            // Eğer önceden seçilmiş bir mahalle varsa, onun sokaklarını da yükle
                            if (selectedNeighborhood && responseData.data[selectedCity][selectedDistrict][selectedNeighborhood]) {
                                const streetList = responseData.data[selectedCity][selectedDistrict][selectedNeighborhood];
                                setStreets(streetList);
                            }
                        }
                    }
                    
                    setLoading(false);
                } else {
                    throw new Error('Bölge bilgileri alınamadı');
                }
            } catch (err) {
                console.error('Bölge verileri getirme hatası:', err);
                setError('Bölge bilgileri yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
                setLoading(false);
            }
        };

        fetchData();
    }, []);
    // tarif bilgisi için eklendi 18.11.2025
useEffect(() => {
    const fetchDescriptionSetting = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            // Admin paneli ile aynı endpoint'i kullanacak şekilde düzeltildi.
            const response = await fetch(`${API_URL}/api/settings/address-description-enabled`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API yanıt hatası: ${response.status}`);
            }

            const data = await response.json();

            // Gelen yanıtın yapısı { status, data: { address_description_enabled: ... } } şeklinde
            if (data && typeof data.enabled !== 'undefined') {
     const isEnabled = data.enabled;
                console.log('✅ Adres tarifi ayarı başarıyla alındı:', isEnabled);
                setIsDescriptionEnabled(isEnabled);
            } else {
                console.warn('⚠️ Adres tarifi ayarı alınamadı veya format yanlış. Özellik pasif bırakıldı.');
                setIsDescriptionEnabled(false);
            }

        } catch (error) {
            console.error('❌ Adres tarifi ayarı alınırken bir hata oluştu:', error);
            // Hata durumunda özelliği pasif yap
            setIsDescriptionEnabled(false);
        }
    };
    fetchDescriptionSetting();
}, []);

    // adresBilgileri prop'undaki değişiklikleri izle
    useEffect(() => {
        // Form bilgileri dışarıdan boşaltıldıysa, tüm form alanlarını temizle
        if (Object.keys(adresBilgileri).length === 0) {
            console.log("AdresSelector: Form temizleniyor...");
            setTitle('');
            setSelectedCity('');
            setSelectedDistrict('');
            setSelectedNeighborhood('');
            setSelectedStreet('');
            setAddressDetail('');
            setAddressDescription(''); // 👈 EKLE
            setDescriptionActive(false); // 👈 EKLE
            setIsDefault(false);
            
            // Sadece cities dışındaki listeleri temizle (cities API'den geldiği için korunmalı)
            setDistricts([]);
            setNeighborhoods([]);
            setStreets([]);
            
            // Dokunulmuşluk durumlarını ve hataları da sıfırla
            setTouched({
                title: false,
                city: false,
                district: false,
                neighborhood: false,
                street: false,
                addressDetail: false
            });
            
            setErrors({
                title: false,
                city: false,
                district: false,
                neighborhood: false,
                street: false,
                addressDetail: false
            });
        }
    }, [adresBilgileri]);

    // Dokunulan alanı işaretle
    const handleTouch = (field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    // Değer değişikliğinde dokunulduğunu işaretle ve validasyonu çağır
    const handleChange = (field, value, setter) => {
        setter(value);
        handleTouch(field);
    };

    // Alan doğrulama fonksiyonu - yalnızca dokunulan alanlar için hata göster
    const validateFields = () => {
        const newErrors = {
            title: touched.title && title === '',
            city: touched.city && selectedCity === '',
            district: touched.district && selectedDistrict === '',
            neighborhood: touched.neighborhood && selectedNeighborhood === '',
            street: touched.street && selectedStreet === '',
            addressDetail: touched.addressDetail && addressDetail === ''
        };
        
        setErrors(newErrors);
        return newErrors;
    };
    
    // Formun tamamının geçerli olup olmadığını kontrol et
    const isFormValid = () => {
        return (
            title !== '' && 
            selectedCity !== '' && 
            selectedDistrict !== '' && 
            selectedNeighborhood !== '' && 
            selectedStreet !== '' && 
            addressDetail !== ''
        );
    };

    // Adres bilgilerini her değişiklikte güncelle
    useEffect(() => {
        // Dokunulan alanların doğrulamasını yap
        validateFields();
        
        // Debug için seçilen değerleri loglayalım
        console.log("Adres bilgileri güncelleniyor:", {
            title, 
            selectedCity, 
            selectedDistrict, 
            selectedNeighborhood, 
            selectedStreet, 
            addressDetail,
            addressDescription // 👈 EKLE
        });
        
        onAdresChange({
            title,
            city: selectedCity,
            district: selectedDistrict,
            neighborhood: selectedNeighborhood,
            street: selectedStreet,
            address_detail: addressDetail,
            address_description: addressDescription, // 👈 EKLE
            is_default: isDefault ? 1 : 0,
            isValid: isFormValid(),
            validate: () => {
                // Tüm alanları dokunulmuş olarak işaretle
                setTouched({
                    title: true,
                    city: true,
                    district: true,
                    neighborhood: true,
                    street: true,
                    addressDetail: true
                });
                
                // Doğrulama yap ve sonucu döndür
                const validationErrors = {
                    title: title === '',
                    city: selectedCity === '',
                    district: selectedDistrict === '',
                    neighborhood: selectedNeighborhood === '',
                    street: selectedStreet === '',
                    addressDetail: addressDetail === ''
                };
                
                setErrors(validationErrors);
                
                return !Object.values(validationErrors).some(error => error);
            }
        });
    }, [title, selectedCity, selectedDistrict, selectedNeighborhood, selectedStreet, addressDetail, addressDescription, isDefault, touched]);

    // Şehir değiştiğinde
    useEffect(() => {
        if (selectedCity) {
            const fetchDistricts = async () => {
                try {
                    const token = await AsyncStorage.getItem('userToken');
                    const response = await fetch(`${API_URL}/api/addresses/regions`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const data = await response.json();
                    
                    if (data.status === "success" && data.data[selectedCity]) {
                        const districtList = Object.keys(data.data[selectedCity]);
                        setDistricts(districtList);
                        
                        // İlçe, mahalle ve sokak seçimlerini sıfırla
                        setSelectedDistrict('');
                        setSelectedNeighborhood('');
                        setSelectedStreet('');
                        setNeighborhoods([]);
                        setStreets([]);
                        
                        // İlçe için dokunulmuş durumunu sıfırla
                        setTouched(prev => ({ ...prev, district: false }));
                        setErrors(prev => ({ ...prev, district: false }));
                    }
                } catch (error) {
                    console.error("İlçe verisi alınamadı:", error);
                }
            };
            
            fetchDistricts();
        }
    }, [selectedCity]);

    // İlçe değiştiğinde
    useEffect(() => {
        if (selectedCity && selectedDistrict) {
            const fetchNeighborhoods = async () => {
                try {
                    const token = await AsyncStorage.getItem('userToken');
                    const response = await fetch(`${API_URL}/api/addresses/regions`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const data = await response.json();
                    
                    if (data.status === "success" && 
                        data.data[selectedCity] && 
                        data.data[selectedCity][selectedDistrict]) {
                        const neighborhoodList = Object.keys(data.data[selectedCity][selectedDistrict]);
                        setNeighborhoods(neighborhoodList);
                        
                        // Mahalle ve sokak seçimlerini sıfırla
                        setSelectedNeighborhood('');
                        setSelectedStreet('');
                        setStreets([]);
                        
                        // Mahalle için dokunulmuş durumunu sıfırla
                        setTouched(prev => ({ ...prev, neighborhood: false }));
                        setErrors(prev => ({ ...prev, neighborhood: false }));
                    }
                } catch (error) {
                    console.error("Mahalle verisi alınamadı:", error);
                }
            };
            
            fetchNeighborhoods();
        }
    }, [selectedDistrict]);

    // Mahalle değiştiğinde
    useEffect(() => {
        if (selectedCity && selectedDistrict && selectedNeighborhood) {
            const fetchStreets = async () => {
                try {
                    const token = await AsyncStorage.getItem('userToken');
                    const response = await fetch(`${API_URL}/api/addresses/regions`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const data = await response.json();
                    
                    if (data.status === "success" && 
                        data.data[selectedCity] && 
                        data.data[selectedCity][selectedDistrict] &&
                        data.data[selectedCity][selectedDistrict][selectedNeighborhood]) {
                        const streetList = data.data[selectedCity][selectedDistrict][selectedNeighborhood];
                        setStreets(streetList);
                        
                        // Sokak seçimini sıfırla
                        setSelectedStreet('');
                        
                        // Sokak için dokunulmuş durumunu sıfırla
                        setTouched(prev => ({ ...prev, street: false }));
                        setErrors(prev => ({ ...prev, street: false }));
                    }
                } catch (error) {
                    console.error("Sokak verisi alınamadı:", error);
                }
            };
            
            fetchStreets();
        }
    }, [selectedNeighborhood]);

    // Loading state
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text>Bölge bilgileri yükleniyor...</Text>
            </View>
        );
    }

    // Error state
    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    // Android için özel render fonksiyonu
    const renderAndroidForm = () => {
        return (
            <>
                <Text style={styles.cityText}> </Text>
                
                <Text style={styles.label}>Adres Başlığı <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                    style={[styles.input, errors.title && styles.errorBorder]}
                    placeholder="Örn: Ev, İş, Yazlık vb."
                    value={title}
                    onChangeText={(text) => handleChange('title', text, setTitle)}
                    onBlur={() => handleTouch('title')}
                />
                {errors.title && <Text style={styles.errorText}>Adres başlığı girilmesi zorunludur</Text>}

                <Text style={styles.label}>Şehir <Text style={styles.requiredStar}>*</Text></Text>
                <View style={[styles.pickerContainer, errors.city && styles.errorBorder]}>
                    <Text style={styles.selectedValueText}>
                        {selectedCity || "Şehir seçin"}
                    </Text>
                    <Picker
                        selectedValue={selectedCity}
                        onValueChange={(value) => handleChange('city', value, setSelectedCity)}
                        style={styles.androidPicker}
                        onBlur={() => handleTouch('city')}
                    >
                        <Picker.Item label="Şehir seçin" value="" />
                        {cities.map((city) => (
                            <Picker.Item key={city} label={city} value={city} />
                        ))}
                    </Picker>
                </View>
                {errors.city && <Text style={styles.errorText}>Şehir seçimi zorunludur</Text>}

                <Text style={styles.label}>İlçe <Text style={styles.requiredStar}>*</Text></Text>
                <View style={[styles.pickerContainer, errors.district && styles.errorBorder]}>
                    <Text style={styles.selectedValueText}>
                        {selectedDistrict || "İlçe seçin"}
                    </Text>
                    <Picker
                        selectedValue={selectedDistrict}
                        onValueChange={(value) => handleChange('district', value, setSelectedDistrict)}
                        style={styles.androidPicker}
                        enabled={districts.length > 0}
                        onBlur={() => handleTouch('district')}
                    >
                        <Picker.Item label="İlçe seçin" value="" />
                        {districts.map((district) => (
                            <Picker.Item key={district} label={district} value={district} />
                        ))}
                    </Picker>
                </View>
                {errors.district && <Text style={styles.errorText}>İlçe seçimi zorunludur</Text>}

                <Text style={styles.label}>Mahalle <Text style={styles.requiredStar}>*</Text></Text>
                <View style={[styles.pickerContainer, errors.neighborhood && styles.errorBorder]}>
                    <Text style={styles.selectedValueText}>
                        {selectedNeighborhood || "Mahalle seçin"}
                    </Text>
                    <Picker
                        selectedValue={selectedNeighborhood}
                        onValueChange={(value) => handleChange('neighborhood', value, setSelectedNeighborhood)}
                        style={styles.androidPicker}
                        enabled={neighborhoods.length > 0}
                        onBlur={() => handleTouch('neighborhood')}
                    >
                        <Picker.Item label="Mahalle seçin" value="" />
                        {neighborhoods.map((neighborhood) => (
                            <Picker.Item key={neighborhood} label={neighborhood} value={neighborhood} />
                        ))}
                    </Picker>
                </View>
                {errors.neighborhood && <Text style={styles.errorText}>Mahalle seçimi zorunludur</Text>}

                <Text style={styles.label}>Sokak <Text style={styles.requiredStar}>*</Text></Text>
                <View style={[styles.pickerContainer, errors.street && styles.errorBorder]}>
                    <Text style={styles.selectedValueText}>
                        {selectedStreet || "Sokak seçin"}
                    </Text>
                    <Picker
                        selectedValue={selectedStreet}
                        onValueChange={(value) => handleChange('street', value, setSelectedStreet)}
                        style={styles.androidPicker}
                        enabled={streets.length > 0}
                        onBlur={() => handleTouch('street')}
                    >
                        <Picker.Item label="Sokak seçin" value="" />
                        {streets.map((street) => (
                            <Picker.Item key={street} label={street} value={street} />
                        ))}
                    </Picker>
                </View>
                {errors.street && <Text style={styles.errorText}>Sokak seçimi zorunludur</Text>}

                <Text style={styles.label}>Adres Detayı <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                    style={[styles.textArea, errors.addressDetail && styles.errorBorder]}
                    placeholder="Bina no, daire no, kat, vb. adres detaylarını yazın"
                    value={addressDetail}
                    onChangeText={(text) => handleChange('addressDetail', text, setAddressDetail)}
                    multiline={true}
                    numberOfLines={4}
                    onBlur={() => handleTouch('addressDetail')}
                />
                {errors.addressDetail && <Text style={styles.errorText}>Adres detayı girilmesi zorunludur</Text>}

       {/* 👇 BURADAN BAŞLAYIN - ADRES TARİFİ BÖLÜMÜ */}
{isDescriptionEnabled && (
    <View style={styles.tarifContainer}>
        {/* ✅ Başlık kısmı - Tuşsuz */}
        <View style={styles.tarifBaslik}>
            <View style={styles.baslikTextContainer}>
                <Text style={styles.tarifBaslikText}>📍 Adresi Tarif Et</Text>
                <TouchableOpacity 
                    onPress={() => Alert.alert(
                        "💡 Adres Tarifi Nedir?",
                        "Adres tarifiniz, kuryenin adresinizi daha hızlı bulmasına yardımcı olur.\n\nÖrnekler:\n• Cami yanında beyaz apartman\n• Eczane karşısı 3. kat\n• Park kenarı kırmızı kapılı ev"
                    )}
                    style={styles.bilgiButonu}
                >
                    <Text style={styles.bilgiButonuText}>ⓘ</Text>
                </TouchableOpacity>
            </View>
        </View>

        {/* ✅ Direkt açıklamalar - Tuş yok */}
        <Text style={styles.tarifAciklama}>
            Kurye adresinizi daha kolay bulabilsin için tarif ekleyin
        </Text>
        <View style={styles.inputContainer}>
            <TextInput
                style={styles.tarifInput}
                placeholder="Örn: Cami yanında beyaz bina, Eczane karşısı 3. kat"
                placeholderTextColor="#999"
                value={addressDescription}
                onChangeText={setAddressDescription}
                multiline
                numberOfLines={3}
                maxLength={200}
            />
            <Text style={styles.karakterSayaci}>
                {addressDescription.length}/200
            </Text>
        </View>
        {addressDescription.trim() === '' && (
            <View style={styles.uyariKutusu}>
                <Text style={styles.uyariText}>
                    💡 Adres tarifinizi yazarak kuryenin daha hızlı bulmasına yardımcı olun
                </Text>
            </View>
        )}
    </View>
)}
{/* 👆 BURAYA KADAR - ADRES TARİFİ BÖLÜMÜ */}

                <View style={styles.checkboxContainer}>
                    <Text style={styles.label}>Varsayılan Adresim</Text>
                    <View style={styles.pickerContainer}>
                        <Text style={styles.selectedValueText}>
                            {isDefault ? "Evet" : "Hayır"}
                        </Text>
                        <Picker
                            selectedValue={isDefault ? "1" : "0"}
                            onValueChange={(value) => setIsDefault(value === "1")}
                            style={styles.androidPicker}
                        >
                            <Picker.Item label="Hayır" value="0" />
                            <Picker.Item label="Evet" value="1" />
                        </Picker>
                    </View>
                </View>

                {/* Formun altına butonların görünmesi için ekstra boş alan */}
                <View style={styles.extraSpace} />
            </>
        );
    };

    // iOS için normal render fonksiyonu
    const renderIOSForm = () => {
        return (
            <>
                <Text style={styles.cityText}> </Text>
                
                <Text style={styles.label}>Adres Başlığı <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                    style={[styles.input, errors.title && styles.errorBorder]}
                    placeholder="Örn: Ev, İş, Yazlık vb."
                    value={title}
                    onChangeText={(text) => handleChange('title', text, setTitle)}
                    onBlur={() => handleTouch('title')}
                />
                {errors.title && <Text style={styles.errorText}>Adres başlığı girilmesi zorunludur</Text>}

                <Text style={styles.label}>Şehir <Text style={styles.requiredStar}>*</Text></Text>
                <View style={[styles.pickerContainer, errors.city && styles.errorBorder]}>
                    <Picker
                        selectedValue={selectedCity}
                        onValueChange={(value) => handleChange('city', value, setSelectedCity)}
                        style={styles.picker}
                        onBlur={() => handleTouch('city')}
                    >
                        <Picker.Item label="Şehir seçin" value="" />
                        {cities.map((city) => (
                            <Picker.Item key={city} label={city} value={city} />
                        ))}
                    </Picker>
                </View>
                {errors.city && <Text style={styles.errorText}>Şehir seçimi zorunludur</Text>}

                <Text style={styles.label}>İlçe <Text style={styles.requiredStar}>*</Text></Text>
                <View style={[styles.pickerContainer, errors.district && styles.errorBorder]}>
                    <Picker
                        selectedValue={selectedDistrict}
                        onValueChange={(value) => handleChange('district', value, setSelectedDistrict)}
                        style={styles.picker}
                        enabled={districts.length > 0}
                        onBlur={() => handleTouch('district')}
                    >
                        <Picker.Item label="İlçe seçin" value="" />
                        {districts.map((district) => (
                            <Picker.Item key={district} label={district} value={district} />
                        ))}
                    </Picker>
                </View>
                {errors.district && <Text style={styles.errorText}>İlçe seçimi zorunludur</Text>}

                <Text style={styles.label}>Mahalle <Text style={styles.requiredStar}>*</Text></Text>
                <View style={[styles.pickerContainer, errors.neighborhood && styles.errorBorder]}>
                    <Picker
                        selectedValue={selectedNeighborhood}
                        onValueChange={(value) => handleChange('neighborhood', value, setSelectedNeighborhood)}
                        style={styles.picker}
                        enabled={neighborhoods.length > 0}
                        onBlur={() => handleTouch('neighborhood')}
                    >
                        <Picker.Item label="Mahalle seçin" value="" />
                        {neighborhoods.map((neighborhood) => (
                            <Picker.Item key={neighborhood} label={neighborhood} value={neighborhood} />
                        ))}
                    </Picker>
                </View>
                {errors.neighborhood && <Text style={styles.errorText}>Mahalle seçimi zorunludur</Text>}

                <Text style={styles.label}>Sokak <Text style={styles.requiredStar}>*</Text></Text>
                <View style={[styles.pickerContainer, errors.street && styles.errorBorder]}>
                    <Picker
                        selectedValue={selectedStreet}
                        onValueChange={(value) => handleChange('street', value, setSelectedStreet)}
                        style={styles.picker}
                        enabled={streets.length > 0}
                        onBlur={() => handleTouch('street')}
                    >
                        <Picker.Item label="Sokak seçin" value="" />
                        {streets.map((street) => (
                            <Picker.Item key={street} label={street} value={street} />
                        ))}
                    </Picker>
                </View>
                {errors.street && <Text style={styles.errorText}>Sokak seçimi zorunludur</Text>}

                <Text style={styles.label}>Adres Detayı <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                    style={[styles.textArea, errors.addressDetail && styles.errorBorder]}
                    placeholder="Bina no, daire no, kat, vb. adres detaylarını yazın"
                    value={addressDetail}
                    onChangeText={(text) => handleChange('addressDetail', text, setAddressDetail)}
                    multiline={true}
                    numberOfLines={4}
                    onBlur={() => handleTouch('addressDetail')}
                />
                {errors.addressDetail && <Text style={styles.errorText}>Adres detayı girilmesi zorunludur</Text>}

                
               {/* 👇 iOS İÇİN ADRES TARİFİ BÖLÜMÜ */}
{isDescriptionEnabled && (
    <View style={styles.tarifContainer}>
        {/* ✅ Başlık kısmı - Tuşsuz */}
        <View style={styles.tarifBaslik}>
            <View style={styles.baslikTextContainer}>
                <Text style={styles.tarifBaslikText}>📍 Adresi Tarif Et</Text>
                <TouchableOpacity 
                    onPress={() => Alert.alert(
                        "💡 Adres Tarifi Nedir?",
                        "Adres tarifiniz, kuryenin adresinizi daha hızlı bulmasına yardımcı olur.\n\nÖrnekler:\n• Cami yanında beyaz apartman\n• Eczane karşısı 3. kat\n• Park kenarı kırmızı kapılı ev"
                    )}
                    style={styles.bilgiButonu}
                >
                    <Text style={styles.bilgiButonuText}>ⓘ</Text>
                </TouchableOpacity>
            </View>
        </View>

        {/* ✅ Direkt açıklamalar - Tuş yok */}
        <Text style={styles.tarifAciklama}>
            Kurye adresinizi daha kolay bulabilsin için tarif ekleyin
        </Text>
        <View style={styles.inputContainer}>
            <TextInput
                style={styles.tarifInput}
                placeholder="Örn: Cami yanında beyaz bina, Eczane karşısı 3. kat"
                placeholderTextColor="#999"
                value={addressDescription}
                onChangeText={setAddressDescription}
                multiline
                numberOfLines={3}
                maxLength={200}
            />
            <Text style={styles.karakterSayaci}>
                {addressDescription.length}/200
            </Text>
        </View>
        {addressDescription.trim() === '' && (
            <View style={styles.uyariKutusu}>
                <Text style={styles.uyariText}>
                    💡 Adres tarifinizi yazarak kuryenin daha hızlı bulmasına yardımcı olun
                </Text>
            </View>
        )}
    </View>
)}
{/* 👆 iOS İÇİN ADRES TARİFİ BÖLÜMÜ */}


                <View style={styles.checkboxContainer}>
                    <Text style={styles.label}>Varsayılan Adresim</Text>
                    <Picker
                        selectedValue={isDefault ? "1" : "0"}
                        onValueChange={(value) => setIsDefault(value === "1")}
                        style={styles.picker}
                    >
                        <Picker.Item label="Hayır" value="0" />
                        <Picker.Item label="Evet" value="1" />
                    </Picker>
                </View>

                {/* Formun altına butonların görünmesi için ekstra boş alan */}
                <View style={styles.extraSpace} />
            </>
        );
    };

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
        >
            {Platform.OS === 'android' ? renderAndroidForm() : renderIOSForm()}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f8f8',
    },
    contentContainer: {
        padding: 15,
        paddingBottom: 120, // BottomTabBar'a ek olarak butonlar için boşluk
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        padding: 20
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        padding: 20
    },
    cityText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
        textAlign: 'center'
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 5,
        color: '#555',
    },
    requiredStar: {
        color: 'red',
        fontSize: 16,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        marginBottom: 15,
        backgroundColor: 'white',
        overflow: 'hidden',
        height: 50, // Tutarlı yükseklik
        justifyContent: 'center', // İçeriği dikey olarak ortala
    },
    picker: {
        height: 50,
        width: '100%',
    },
    // Android için özel stiller
    androidPicker: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0, // Görünmez ama çalışan Picker
        height: 50,
    },
    selectedValueText: {
        fontSize: 14,
        color: '#555',
        marginLeft: 10,
        textAlignVertical: 'center',
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 10,
        marginBottom: 15,
        backgroundColor: 'white',
    },
    textArea: {
        height: 100,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 10,
        marginBottom: 15,
        textAlignVertical: 'top',
        backgroundColor: 'white',
    },
    checkboxContainer: {
        marginBottom: 20, // Alt boşluk
    },
    errorBorder: {
        borderColor: 'red',
    },
    errorText: {
        color: 'red',
        fontSize: 12,
        marginBottom: 15,
    },
    // Formun altına ekstra boşluk
    extraSpace: {
        height: 80, // Kaydet butonunun görünür olması için ekstra alan
    },
     // 👇 ADRES TARİFİ STİLLERİ
    tarifContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#FFD4B3',
    },
    tarifBaslik: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    baslikTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    tarifBaslikText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    bilgiButonu: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#E8F4FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bilgiButonuText: {
        color: '#2196F3',
        fontSize: 12,
        fontWeight: 'bold',
    },
    tarifAciklama: {
        fontSize: 13,
        color: '#666',
        marginBottom: 12,
        lineHeight: 18,
    },
    inputContainer: {
        position: 'relative',
        marginBottom: 5,
    },
    tarifInput: {
        borderWidth: 1,
        borderColor: '#FFD4B3',
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        color: '#333',
        backgroundColor: '#FFFAF6',
        textAlignVertical: 'top',
        minHeight: 80,
    },
    karakterSayaci: {
        position: 'absolute',
        bottom: 8,
        right: 12,
        fontSize: 11,
        color: '#999',
        backgroundColor: 'white',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    uyariKutusu: {
        backgroundColor: '#FFF3E0',
        borderLeftWidth: 3,
        borderLeftColor: '#FF8C42',
        padding: 10,
        borderRadius: 6,
        marginTop: 8,
    },
    uyariText: {
        color: '#E65100',
        fontSize: 12,
        fontWeight: '500',
    },
});

export default AdresSelector;