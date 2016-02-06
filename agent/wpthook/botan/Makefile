# Compiler Options
CXX            = cl  /MD /bigobj
LINKER         = link

CXXFLAGS       = /EHs /GR /O2
WARN_FLAGS     = /W3 /wd4275 /wd4267
SO_OBJ_FLAGS   =  /DBOTAN_DLL=__declspec(dllexport)

LIB_LINK_CMD   = $(LINKER) /DLL
CLI_LINK_CMD   = $(LINKER)
TEST_LINK_CMD  = $(LINKER)

LIB_LINKS_TO   = advapi32.lib user32.lib
CLI_LINKS_TO   = $(LIB_LINKS_TO)
TEST_LINKS_TO  = $(LIB_LINKS_TO)

LIB_FLAGS      = $(SO_OBJ_FLAGS) $(CXXFLAGS) $(WARN_FLAGS)
CLI_FLAGS      = $(CXXFLAGS) $(WARN_FLAGS)
TEST_FLAGS     = $(CXXFLAGS) $(WARN_FLAGS)

SCRIPTS_DIR    = src\scripts

CLI_POST_LINK_CMD  = 
TEST_POST_LINK_CMD = 


### Aliases for Common Programs
AR            = lib
COPY          = copy
CD            = @cd
ECHO          = @echo
INSTALL       = copy
INSTALL_CMD   = copy
MKDIR         = @md
MKDIR_INSTALL = @md
RM            = @del /Q
RM_R          = $(RM) /S
RMDIR         = @rmdir

# Executable targets
CLI           = .\botan.exe
TEST          = .\botan-test.exe

# Library targets
#
# LIB_FILENAME is always the .lib file, that is either a static lib or a
# by-product of the DLL creation used to link the DLL into applications
LIB_BASENAME  = botan
LIB_FILENAME  = .\$(LIB_BASENAME).lib

!If "$(SO_OBJ_FLAGS)" == ""
# static lib
LIBRARIES     = $(LIB_FILENAME)
!Else
# shared lib
SO_FILENAME   = .\$(LIB_BASENAME).dll
LIBRARIES     = $(SO_FILENAME)
!Endif


# File Lists
LIBOBJS       = build\obj\lib\asn1_alg_id.obj \
                build\obj\lib\asn1_alt_name.obj \
                build\obj\lib\asn1_attribute.obj \
                build\obj\lib\asn1_obj.obj \
                build\obj\lib\asn1_oid.obj \
                build\obj\lib\asn1_str.obj \
                build\obj\lib\asn1_time.obj \
                build\obj\lib\asn1_ber_dec.obj \
                build\obj\lib\asn1_der_enc.obj \
                build\obj\lib\asn1_oid_lookup_default.obj \
                build\obj\lib\asn1_oid_lookup_oids.obj \
                build\obj\lib\asn1_x509_dn.obj \
                build\obj\lib\base_init.obj \
                build\obj\lib\base_scan_name.obj \
                build\obj\lib\base_symkey.obj \
                build\obj\lib\base_transform.obj \
                build\obj\lib\block_aes.obj \
                build\obj\lib\block_aes_ni.obj \
                build\obj\lib\block_aes_ssse3.obj \
                build\obj\lib\block_cipher.obj \
                build\obj\lib\block_blowfish_blfs_tab.obj \
                build\obj\lib\block_blowfish.obj \
                build\obj\lib\block_camellia.obj \
                build\obj\lib\block_cascade.obj \
                build\obj\lib\block_cast_cast128.obj \
                build\obj\lib\block_cast_cast256.obj \
                build\obj\lib\block_des.obj \
                build\obj\lib\block_des_tab.obj \
                build\obj\lib\block_des_desx.obj \
                build\obj\lib\block_gost_28147.obj \
                build\obj\lib\block_idea.obj \
                build\obj\lib\block_idea_sse2.obj \
                build\obj\lib\block_kasumi.obj \
                build\obj\lib\block_lion.obj \
                build\obj\lib\block_mars.obj \
                build\obj\lib\block_misty1.obj \
                build\obj\lib\block_noekeon.obj \
                build\obj\lib\block_noekeon_simd.obj \
                build\obj\lib\block_rc2.obj \
                build\obj\lib\block_rc5.obj \
                build\obj\lib\block_rc6.obj \
                build\obj\lib\block_safer_sk.obj \
                build\obj\lib\block_seed.obj \
                build\obj\lib\block_serpent.obj \
                build\obj\lib\block_serpent_simd_serp_simd.obj \
                build\obj\lib\block_tea.obj \
                build\obj\lib\block_threefish.obj \
                build\obj\lib\block_twofish_two_tab.obj \
                build\obj\lib\block_twofish.obj \
                build\obj\lib\block_xtea.obj \
                build\obj\lib\block_xtea_simd.obj \
                build\obj\lib\cert_x509_certstor.obj \
                build\obj\lib\cert_x509_crl_ent.obj \
                build\obj\lib\cert_x509_key_constraint.obj \
                build\obj\lib\cert_x509_ocsp.obj \
                build\obj\lib\cert_x509_ocsp_types.obj \
                build\obj\lib\cert_x509_pkcs10.obj \
                build\obj\lib\cert_x509_ca.obj \
                build\obj\lib\cert_x509_crl.obj \
                build\obj\lib\cert_x509_ext.obj \
                build\obj\lib\cert_x509_obj.obj \
                build\obj\lib\cert_x509_x509cert.obj \
                build\obj\lib\cert_x509_x509opt.obj \
                build\obj\lib\cert_x509_x509path.obj \
                build\obj\lib\cert_x509_x509self.obj \
                build\obj\lib\codec_base64.obj \
                build\obj\lib\codec_hex.obj \
                build\obj\lib\compression.obj \
                build\obj\lib\entropy_cryptoapi_rng_es_capi.obj \
                build\obj\lib\entropy_srcs.obj \
                build\obj\lib\entropy_hres_timer.obj \
                build\obj\lib\entropy_rdrand.obj \
                build\obj\lib\entropy_rdseed.obj \
                build\obj\lib\entropy_win32_stats_es_win32.obj \
                build\obj\lib\ffi.obj \
                build\obj\lib\filters_algo_filt.obj \
                build\obj\lib\filters_basefilt.obj \
                build\obj\lib\filters_buf_filt.obj \
                build\obj\lib\filters_codec_filt_b64_filt.obj \
                build\obj\lib\filters_codec_filt_hex_filt.obj \
                build\obj\lib\filters_comp_filter.obj \
                build\obj\lib\filters_data_snk.obj \
                build\obj\lib\filters_filter.obj \
                build\obj\lib\filters_key_filt.obj \
                build\obj\lib\filters_out_buf.obj \
                build\obj\lib\filters_pipe.obj \
                build\obj\lib\filters_pipe_io.obj \
                build\obj\lib\filters_pipe_rw.obj \
                build\obj\lib\filters_secqueue.obj \
                build\obj\lib\filters_threaded_fork.obj \
                build\obj\lib\filters_transform_filter.obj \
                build\obj\lib\hash_checksum_adler32.obj \
                build\obj\lib\hash_checksum_crc24.obj \
                build\obj\lib\hash_checksum_crc32.obj \
                build\obj\lib\hash_comb4p.obj \
                build\obj\lib\hash_gost_3411.obj \
                build\obj\lib\hash_has160.obj \
                build\obj\lib\hash.obj \
                build\obj\lib\hash_keccak.obj \
                build\obj\lib\hash_md2.obj \
                build\obj\lib\hash_md4.obj \
                build\obj\lib\hash_md5.obj \
                build\obj\lib\hash_mdx_hash.obj \
                build\obj\lib\hash_par_hash.obj \
                build\obj\lib\hash_rmd128.obj \
                build\obj\lib\hash_rmd160.obj \
                build\obj\lib\hash_sha1_sha160.obj \
                build\obj\lib\hash_sha1_sse2.obj \
                build\obj\lib\hash_sha2_32.obj \
                build\obj\lib\hash_sha2_64.obj \
                build\obj\lib\hash_skein_512.obj \
                build\obj\lib\hash_tiger_tig_tab.obj \
                build\obj\lib\hash_tiger.obj \
                build\obj\lib\hash_whirlpool.obj \
                build\obj\lib\hash_whirlpool_whrl_tab.obj \
                build\obj\lib\kdf_hkdf.obj \
                build\obj\lib\kdf.obj \
                build\obj\lib\kdf_kdf1.obj \
                build\obj\lib\kdf_kdf2.obj \
                build\obj\lib\kdf_prf_tls.obj \
                build\obj\lib\kdf_prf_x942.obj \
                build\obj\lib\mac_cbc_mac.obj \
                build\obj\lib\mac_cmac.obj \
                build\obj\lib\mac_hmac.obj \
                build\obj\lib\mac.obj \
                build\obj\lib\mac_poly1305.obj \
                build\obj\lib\mac_siphash.obj \
                build\obj\lib\mac_x919_mac.obj \
                build\obj\lib\math_bigint_big_code.obj \
                build\obj\lib\math_bigint_big_io.obj \
                build\obj\lib\math_bigint_big_ops2.obj \
                build\obj\lib\math_bigint_big_ops3.obj \
                build\obj\lib\math_bigint_big_rand.obj \
                build\obj\lib\math_bigint.obj \
                build\obj\lib\math_bigint_divide.obj \
                build\obj\lib\math_ec_gfp_curve_gfp.obj \
                build\obj\lib\math_ec_gfp_curve_nistp.obj \
                build\obj\lib\math_ec_gfp_point_gfp.obj \
                build\obj\lib\math_mp_asm.obj \
                build\obj\lib\math_mp_comba.obj \
                build\obj\lib\math_mp_karat.obj \
                build\obj\lib\math_mp_misc.obj \
                build\obj\lib\math_mp_monty.obj \
                build\obj\lib\math_mp_shift.obj \
                build\obj\lib\math_numbertheory_dsa_gen.obj \
                build\obj\lib\math_numbertheory_jacobi.obj \
                build\obj\lib\math_numbertheory_make_prm.obj \
                build\obj\lib\math_numbertheory_mp_numth.obj \
                build\obj\lib\math_numbertheory_numthry.obj \
                build\obj\lib\math_numbertheory_pow_mod.obj \
                build\obj\lib\math_numbertheory_powm_fw.obj \
                build\obj\lib\math_numbertheory_powm_mnt.obj \
                build\obj\lib\math_numbertheory_primes.obj \
                build\obj\lib\math_numbertheory_reducer.obj \
                build\obj\lib\math_numbertheory_ressol.obj \
                build\obj\lib\misc_aont_package.obj \
                build\obj\lib\misc_cryptobox.obj \
                build\obj\lib\misc_fpe_fe1.obj \
                build\obj\lib\misc_openpgp.obj \
                build\obj\lib\misc_pbes2.obj \
                build\obj\lib\misc_pem.obj \
                build\obj\lib\misc_rfc3394.obj \
                build\obj\lib\misc_srp6.obj \
                build\obj\lib\misc_srp6_files.obj \
                build\obj\lib\misc_tss.obj \
                build\obj\lib\modes_aead.obj \
                build\obj\lib\modes_aead_ccm.obj \
                build\obj\lib\modes_aead_chacha20poly1305.obj \
                build\obj\lib\modes_aead_eax.obj \
                build\obj\lib\modes_aead_gcm_clmul.obj \
                build\obj\lib\modes_aead_gcm.obj \
                build\obj\lib\modes_aead_ocb.obj \
                build\obj\lib\modes_aead_siv.obj \
                build\obj\lib\modes_cbc.obj \
                build\obj\lib\modes_cfb.obj \
                build\obj\lib\modes_cipher_mode.obj \
                build\obj\lib\modes_ecb.obj \
                build\obj\lib\modes_mode_pad.obj \
                build\obj\lib\modes_xts.obj \
                build\obj\lib\passhash_bcrypt.obj \
                build\obj\lib\passhash_passhash9.obj \
                build\obj\lib\pbkdf.obj \
                build\obj\lib\pbkdf_pbkdf1.obj \
                build\obj\lib\pbkdf_pbkdf2.obj \
                build\obj\lib\pk_pad_eme.obj \
                build\obj\lib\pk_pad_eme_oaep_oaep.obj \
                build\obj\lib\pk_pad_eme_pkcs1_eme_pkcs.obj \
                build\obj\lib\pk_pad_eme_raw.obj \
                build\obj\lib\pk_pad_emsa.obj \
                build\obj\lib\pk_pad_emsa1.obj \
                build\obj\lib\pk_pad_emsa1_bsi.obj \
                build\obj\lib\pk_pad_emsa_pkcs1.obj \
                build\obj\lib\pk_pad_emsa_pssr_pssr.obj \
                build\obj\lib\pk_pad_emsa_raw.obj \
                build\obj\lib\pk_pad_emsa_x931.obj \
                build\obj\lib\pk_pad_hash_id.obj \
                build\obj\lib\pk_pad_mgf1.obj \
                build\obj\lib\pubkey_blinding.obj \
                build\obj\lib\pubkey_curve25519.obj \
                build\obj\lib\pubkey_curve25519_donna.obj \
                build\obj\lib\pubkey_dh.obj \
                build\obj\lib\pubkey_dl_algo.obj \
                build\obj\lib\pubkey_dl_group.obj \
                build\obj\lib\pubkey_dl_group_named.obj \
                build\obj\lib\pubkey_dlies.obj \
                build\obj\lib\pubkey_dsa.obj \
                build\obj\lib\pubkey_ec_group.obj \
                build\obj\lib\pubkey_ec_group_named.obj \
                build\obj\lib\pubkey_ecc_key.obj \
                build\obj\lib\pubkey_ecdh.obj \
                build\obj\lib\pubkey_ecdsa.obj \
                build\obj\lib\pubkey_elgamal.obj \
                build\obj\lib\pubkey_gost_3410.obj \
                build\obj\lib\pubkey_if_algo.obj \
                build\obj\lib\pubkey_keypair.obj \
                build\obj\lib\pubkey_mce_code_based_key_gen.obj \
                build\obj\lib\pubkey_mce_gf2m_rootfind_dcmp.obj \
                build\obj\lib\pubkey_mce_gf2m_small_m.obj \
                build\obj\lib\pubkey_mce_goppa_code.obj \
                build\obj\lib\pubkey_mce_mceliece.obj \
                build\obj\lib\pubkey_mce_mceliece_key.obj \
                build\obj\lib\pubkey_mce_polyn_gf2m.obj \
                build\obj\lib\pubkey_mce_workfactor.obj \
                build\obj\lib\pubkey_mceies.obj \
                build\obj\lib\pubkey_nr.obj \
                build\obj\lib\pubkey_pk_algs.obj \
                build\obj\lib\pubkey_pk_keys.obj \
                build\obj\lib\pubkey_pk_ops.obj \
                build\obj\lib\pubkey_pkcs8.obj \
                build\obj\lib\pubkey.obj \
                build\obj\lib\pubkey_rfc6979.obj \
                build\obj\lib\pubkey_rsa.obj \
                build\obj\lib\pubkey_rw.obj \
                build\obj\lib\pubkey_workfactor.obj \
                build\obj\lib\pubkey_x509_key.obj \
                build\obj\lib\rng_hmac_drbg.obj \
                build\obj\lib\rng_hmac_rng.obj \
                build\obj\lib\rng.obj \
                build\obj\lib\rng_system_rng.obj \
                build\obj\lib\rng_x931_rng.obj \
                build\obj\lib\stream_chacha.obj \
                build\obj\lib\stream_ctr.obj \
                build\obj\lib\stream_ofb.obj \
                build\obj\lib\stream_rc4.obj \
                build\obj\lib\stream_salsa20.obj \
                build\obj\lib\stream_cipher.obj \
                build\obj\lib\tls_credentials_manager.obj \
                build\obj\lib\tls_msg_cert_req.obj \
                build\obj\lib\tls_msg_cert_verify.obj \
                build\obj\lib\tls_msg_certificate.obj \
                build\obj\lib\tls_msg_client_hello.obj \
                build\obj\lib\tls_msg_client_kex.obj \
                build\obj\lib\tls_msg_finished.obj \
                build\obj\lib\tls_msg_hello_verify.obj \
                build\obj\lib\tls_msg_server_hello.obj \
                build\obj\lib\tls_msg_server_kex.obj \
                build\obj\lib\tls_msg_session_ticket.obj \
                build\obj\lib\tls_sessions_sql_tls_session_manager_sql.obj \
                build\obj\lib\tls_alert.obj \
                build\obj\lib\tls_blocking.obj \
                build\obj\lib\tls_channel.obj \
                build\obj\lib\tls_ciphersuite.obj \
                build\obj\lib\tls_client.obj \
                build\obj\lib\tls_extensions.obj \
                build\obj\lib\tls_handshake_hash.obj \
                build\obj\lib\tls_handshake_io.obj \
                build\obj\lib\tls_handshake_state.obj \
                build\obj\lib\tls_heartbeats.obj \
                build\obj\lib\tls_policy.obj \
                build\obj\lib\tls_record.obj \
                build\obj\lib\tls_server.obj \
                build\obj\lib\tls_session.obj \
                build\obj\lib\tls_session_key.obj \
                build\obj\lib\tls_session_manager_memory.obj \
                build\obj\lib\tls_suite_info.obj \
                build\obj\lib\tls_version.obj \
                build\obj\lib\utils_assert.obj \
                build\obj\lib\utils_calendar.obj \
                build\obj\lib\utils_charset.obj \
                build\obj\lib\utils_cpuid.obj \
                build\obj\lib\utils_data_src.obj \
                build\obj\lib\utils_datastor.obj \
                build\obj\lib\utils_filesystem.obj \
                build\obj\lib\utils_http_util.obj \
                build\obj\lib\utils_locking_allocator.obj \
                build\obj\lib\utils_os_utils.obj \
                build\obj\lib\utils_parsing.obj \
                build\obj\lib\utils_read_cfg.obj \
                build\obj\lib\utils_semaphore.obj \
                build\obj\lib\utils_version.obj \
                build\obj\lib\utils_zero_mem.obj

CLIOBJS       = build\obj\cli\asn1.obj \
                build\obj\cli\bench.obj \
                build\obj\cli\cc_enc.obj \
                build\obj\cli\compress.obj \
                build\obj\cli\main.obj \
                build\obj\cli\math.obj \
                build\obj\cli\pubkey.obj \
                build\obj\cli\tls_client.obj \
                build\obj\cli\tls_proxy.obj \
                build\obj\cli\tls_server.obj \
                build\obj\cli\utils.obj \
                build\obj\cli\x509.obj

TESTOBJS      = build\obj\test\main.obj \
                build\obj\test\tests.obj \
                build\obj\test\test_aead.obj \
                build\obj\test\test_bigint.obj \
                build\obj\test\test_block.obj \
                build\obj\test\test_c25519.obj \
                build\obj\test\test_compression.obj \
                build\obj\test\test_cryptobox.obj \
                build\obj\test\test_cvc.obj \
                build\obj\test\test_dh.obj \
                build\obj\test\test_dlies.obj \
                build\obj\test\test_dsa.obj \
                build\obj\test\test_ecc_pointmul.obj \
                build\obj\test\test_ecdh.obj \
                build\obj\test\test_ecdsa.obj \
                build\obj\test\test_elg.obj \
                build\obj\test\test_entropy.obj \
                build\obj\test\test_ffi.obj \
                build\obj\test\test_fuzzer.obj \
                build\obj\test\test_gf2m.obj \
                build\obj\test\test_gost_3410.obj \
                build\obj\test\test_hash.obj \
                build\obj\test\test_kdf.obj \
                build\obj\test\test_keywrap.obj \
                build\obj\test\test_mac.obj \
                build\obj\test\test_mceliece.obj \
                build\obj\test\test_modes.obj \
                build\obj\test\test_nr.obj \
                build\obj\test\test_ocb.obj \
                build\obj\test\test_passhash.obj \
                build\obj\test\test_pbkdf.obj \
                build\obj\test\test_pubkey.obj \
                build\obj\test\test_rfc6979.obj \
                build\obj\test\test_rng.obj \
                build\obj\test\test_rsa.obj \
                build\obj\test\test_rw.obj \
                build\obj\test\test_srp6.obj \
                build\obj\test\test_stream.obj \
                build\obj\test\test_tss.obj \
                build\obj\test\test_utils.obj \
                build\obj\test\test_x509_path.obj \
                build\obj\test\unit_ecc.obj \
                build\obj\test\unit_ecdh.obj \
                build\obj\test\unit_ecdsa.obj \
                build\obj\test\unit_tls.obj \
                build\obj\test\unit_x509.obj

# First make target. Will be used by default
all: $(CLI) $(TEST)

# Build Commands
build\obj\lib\asn1_alg_id.obj: src\lib\asn1\alg_id.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\asn1\alg_id.cpp /Fo$@

build\obj\lib\asn1_alt_name.obj: src\lib\asn1\asn1_alt_name.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\asn1\asn1_alt_name.cpp /Fo$@

build\obj\lib\asn1_attribute.obj: src\lib\asn1\asn1_attribute.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\asn1\asn1_attribute.cpp /Fo$@

build\obj\lib\asn1_obj.obj: src\lib\asn1\asn1_obj.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\asn1\asn1_obj.cpp /Fo$@

build\obj\lib\asn1_oid.obj: src\lib\asn1\asn1_oid.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\asn1\asn1_oid.cpp /Fo$@

build\obj\lib\asn1_str.obj: src\lib\asn1\asn1_str.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\asn1\asn1_str.cpp /Fo$@

build\obj\lib\asn1_time.obj: src\lib\asn1\asn1_time.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\asn1\asn1_time.cpp /Fo$@

build\obj\lib\asn1_ber_dec.obj: src\lib\asn1\ber_dec.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\asn1\ber_dec.cpp /Fo$@

build\obj\lib\asn1_der_enc.obj: src\lib\asn1\der_enc.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\asn1\der_enc.cpp /Fo$@

build\obj\lib\asn1_oid_lookup_default.obj: src\lib\asn1\oid_lookup\default.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\asn1\oid_lookup\default.cpp /Fo$@

build\obj\lib\asn1_oid_lookup_oids.obj: src\lib\asn1\oid_lookup\oids.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\asn1\oid_lookup\oids.cpp /Fo$@

build\obj\lib\asn1_x509_dn.obj: src\lib\asn1\x509_dn.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\asn1\x509_dn.cpp /Fo$@

build\obj\lib\base_init.obj: src\lib\base\init.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\base\init.cpp /Fo$@

build\obj\lib\base_scan_name.obj: src\lib\base\scan_name.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\base\scan_name.cpp /Fo$@

build\obj\lib\base_symkey.obj: src\lib\base\symkey.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\base\symkey.cpp /Fo$@

build\obj\lib\base_transform.obj: src\lib\base\transform.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\base\transform.cpp /Fo$@

build\obj\lib\block_aes.obj: src\lib\block\aes\aes.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\aes\aes.cpp /Fo$@

build\obj\lib\block_aes_ni.obj: src\lib\block\aes_ni\aes_ni.cpp
	$(CXX)  $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\aes_ni\aes_ni.cpp /Fo$@

build\obj\lib\block_aes_ssse3.obj: src\lib\block\aes_ssse3\aes_ssse3.cpp
	$(CXX)  $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\aes_ssse3\aes_ssse3.cpp /Fo$@

build\obj\lib\block_cipher.obj: src\lib\block\block_cipher.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\block_cipher.cpp /Fo$@

build\obj\lib\block_blowfish_blfs_tab.obj: src\lib\block\blowfish\blfs_tab.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\blowfish\blfs_tab.cpp /Fo$@

build\obj\lib\block_blowfish.obj: src\lib\block\blowfish\blowfish.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\blowfish\blowfish.cpp /Fo$@

build\obj\lib\block_camellia.obj: src\lib\block\camellia\camellia.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\camellia\camellia.cpp /Fo$@

build\obj\lib\block_cascade.obj: src\lib\block\cascade\cascade.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\cascade\cascade.cpp /Fo$@

build\obj\lib\block_cast_cast128.obj: src\lib\block\cast\cast128.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\cast\cast128.cpp /Fo$@

build\obj\lib\block_cast_cast256.obj: src\lib\block\cast\cast256.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\cast\cast256.cpp /Fo$@

build\obj\lib\block_des.obj: src\lib\block\des\des.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\des\des.cpp /Fo$@

build\obj\lib\block_des_tab.obj: src\lib\block\des\des_tab.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\des\des_tab.cpp /Fo$@

build\obj\lib\block_des_desx.obj: src\lib\block\des\desx.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\des\desx.cpp /Fo$@

build\obj\lib\block_gost_28147.obj: src\lib\block\gost_28147\gost_28147.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\gost_28147\gost_28147.cpp /Fo$@

build\obj\lib\block_idea.obj: src\lib\block\idea\idea.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\idea\idea.cpp /Fo$@

build\obj\lib\block_idea_sse2.obj: src\lib\block\idea_sse2\idea_sse2.cpp
	$(CXX)  $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\idea_sse2\idea_sse2.cpp /Fo$@

build\obj\lib\block_kasumi.obj: src\lib\block\kasumi\kasumi.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\kasumi\kasumi.cpp /Fo$@

build\obj\lib\block_lion.obj: src\lib\block\lion\lion.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\lion\lion.cpp /Fo$@

build\obj\lib\block_mars.obj: src\lib\block\mars\mars.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\mars\mars.cpp /Fo$@

build\obj\lib\block_misty1.obj: src\lib\block\misty1\misty1.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\misty1\misty1.cpp /Fo$@

build\obj\lib\block_noekeon.obj: src\lib\block\noekeon\noekeon.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\noekeon\noekeon.cpp /Fo$@

build\obj\lib\block_noekeon_simd.obj: src\lib\block\noekeon_simd\noekeon_simd.cpp
	$(CXX)  $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\noekeon_simd\noekeon_simd.cpp /Fo$@

build\obj\lib\block_rc2.obj: src\lib\block\rc2\rc2.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\rc2\rc2.cpp /Fo$@

build\obj\lib\block_rc5.obj: src\lib\block\rc5\rc5.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\rc5\rc5.cpp /Fo$@

build\obj\lib\block_rc6.obj: src\lib\block\rc6\rc6.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\rc6\rc6.cpp /Fo$@

build\obj\lib\block_safer_sk.obj: src\lib\block\safer\safer_sk.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\safer\safer_sk.cpp /Fo$@

build\obj\lib\block_seed.obj: src\lib\block\seed\seed.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\seed\seed.cpp /Fo$@

build\obj\lib\block_serpent.obj: src\lib\block\serpent\serpent.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\serpent\serpent.cpp /Fo$@

build\obj\lib\block_serpent_simd_serp_simd.obj: src\lib\block\serpent_simd\serp_simd.cpp
	$(CXX)  $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\serpent_simd\serp_simd.cpp /Fo$@

build\obj\lib\block_tea.obj: src\lib\block\tea\tea.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\tea\tea.cpp /Fo$@

build\obj\lib\block_threefish.obj: src\lib\block\threefish\threefish.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\threefish\threefish.cpp /Fo$@

build\obj\lib\block_twofish_two_tab.obj: src\lib\block\twofish\two_tab.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\twofish\two_tab.cpp /Fo$@

build\obj\lib\block_twofish.obj: src\lib\block\twofish\twofish.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\twofish\twofish.cpp /Fo$@

build\obj\lib\block_xtea.obj: src\lib\block\xtea\xtea.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\xtea\xtea.cpp /Fo$@

build\obj\lib\block_xtea_simd.obj: src\lib\block\xtea_simd\xtea_simd.cpp
	$(CXX)  $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\block\xtea_simd\xtea_simd.cpp /Fo$@

build\obj\lib\cert_x509_certstor.obj: src\lib\cert\x509\certstor.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\cert\x509\certstor.cpp /Fo$@

build\obj\lib\cert_x509_crl_ent.obj: src\lib\cert\x509\crl_ent.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\cert\x509\crl_ent.cpp /Fo$@

build\obj\lib\cert_x509_key_constraint.obj: src\lib\cert\x509\key_constraint.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\cert\x509\key_constraint.cpp /Fo$@

build\obj\lib\cert_x509_ocsp.obj: src\lib\cert\x509\ocsp.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\cert\x509\ocsp.cpp /Fo$@

build\obj\lib\cert_x509_ocsp_types.obj: src\lib\cert\x509\ocsp_types.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\cert\x509\ocsp_types.cpp /Fo$@

build\obj\lib\cert_x509_pkcs10.obj: src\lib\cert\x509\pkcs10.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\cert\x509\pkcs10.cpp /Fo$@

build\obj\lib\cert_x509_ca.obj: src\lib\cert\x509\x509_ca.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\cert\x509\x509_ca.cpp /Fo$@

build\obj\lib\cert_x509_crl.obj: src\lib\cert\x509\x509_crl.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\cert\x509\x509_crl.cpp /Fo$@

build\obj\lib\cert_x509_ext.obj: src\lib\cert\x509\x509_ext.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\cert\x509\x509_ext.cpp /Fo$@

build\obj\lib\cert_x509_obj.obj: src\lib\cert\x509\x509_obj.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\cert\x509\x509_obj.cpp /Fo$@

build\obj\lib\cert_x509_x509cert.obj: src\lib\cert\x509\x509cert.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\cert\x509\x509cert.cpp /Fo$@

build\obj\lib\cert_x509_x509opt.obj: src\lib\cert\x509\x509opt.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\cert\x509\x509opt.cpp /Fo$@

build\obj\lib\cert_x509_x509path.obj: src\lib\cert\x509\x509path.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\cert\x509\x509path.cpp /Fo$@

build\obj\lib\cert_x509_x509self.obj: src\lib\cert\x509\x509self.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\cert\x509\x509self.cpp /Fo$@

build\obj\lib\codec_base64.obj: src\lib\codec\base64\base64.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\codec\base64\base64.cpp /Fo$@

build\obj\lib\codec_hex.obj: src\lib\codec\hex\hex.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\codec\hex\hex.cpp /Fo$@

build\obj\lib\compression.obj: src\lib\compression\compression.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\compression\compression.cpp /Fo$@

build\obj\lib\entropy_cryptoapi_rng_es_capi.obj: src\lib\entropy\cryptoapi_rng\es_capi.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\entropy\cryptoapi_rng\es_capi.cpp /Fo$@

build\obj\lib\entropy_srcs.obj: src\lib\entropy\entropy_srcs.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\entropy\entropy_srcs.cpp /Fo$@

build\obj\lib\entropy_hres_timer.obj: src\lib\entropy\hres_timer\hres_timer.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\entropy\hres_timer\hres_timer.cpp /Fo$@

build\obj\lib\entropy_rdrand.obj: src\lib\entropy\rdrand\rdrand.cpp
	$(CXX)  $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\entropy\rdrand\rdrand.cpp /Fo$@

build\obj\lib\entropy_rdseed.obj: src\lib\entropy\rdseed\rdseed.cpp
	$(CXX)  $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\entropy\rdseed\rdseed.cpp /Fo$@

build\obj\lib\entropy_win32_stats_es_win32.obj: src\lib\entropy\win32_stats\es_win32.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\entropy\win32_stats\es_win32.cpp /Fo$@

build\obj\lib\ffi.obj: src\lib\ffi\ffi.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\ffi\ffi.cpp /Fo$@

build\obj\lib\filters_algo_filt.obj: src\lib\filters\algo_filt.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\filters\algo_filt.cpp /Fo$@

build\obj\lib\filters_basefilt.obj: src\lib\filters\basefilt.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\filters\basefilt.cpp /Fo$@

build\obj\lib\filters_buf_filt.obj: src\lib\filters\buf_filt.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\filters\buf_filt.cpp /Fo$@

build\obj\lib\filters_codec_filt_b64_filt.obj: src\lib\filters\codec_filt\b64_filt.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\filters\codec_filt\b64_filt.cpp /Fo$@

build\obj\lib\filters_codec_filt_hex_filt.obj: src\lib\filters\codec_filt\hex_filt.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\filters\codec_filt\hex_filt.cpp /Fo$@

build\obj\lib\filters_comp_filter.obj: src\lib\filters\comp_filter.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\filters\comp_filter.cpp /Fo$@

build\obj\lib\filters_data_snk.obj: src\lib\filters\data_snk.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\filters\data_snk.cpp /Fo$@

build\obj\lib\filters_filter.obj: src\lib\filters\filter.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\filters\filter.cpp /Fo$@

build\obj\lib\filters_key_filt.obj: src\lib\filters\key_filt.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\filters\key_filt.cpp /Fo$@

build\obj\lib\filters_out_buf.obj: src\lib\filters\out_buf.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\filters\out_buf.cpp /Fo$@

build\obj\lib\filters_pipe.obj: src\lib\filters\pipe.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\filters\pipe.cpp /Fo$@

build\obj\lib\filters_pipe_io.obj: src\lib\filters\pipe_io.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\filters\pipe_io.cpp /Fo$@

build\obj\lib\filters_pipe_rw.obj: src\lib\filters\pipe_rw.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\filters\pipe_rw.cpp /Fo$@

build\obj\lib\filters_secqueue.obj: src\lib\filters\secqueue.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\filters\secqueue.cpp /Fo$@

build\obj\lib\filters_threaded_fork.obj: src\lib\filters\threaded_fork.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\filters\threaded_fork.cpp /Fo$@

build\obj\lib\filters_transform_filter.obj: src\lib\filters\transform_filter.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\filters\transform_filter.cpp /Fo$@

build\obj\lib\hash_checksum_adler32.obj: src\lib\hash\checksum\adler32\adler32.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\checksum\adler32\adler32.cpp /Fo$@

build\obj\lib\hash_checksum_crc24.obj: src\lib\hash\checksum\crc24\crc24.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\checksum\crc24\crc24.cpp /Fo$@

build\obj\lib\hash_checksum_crc32.obj: src\lib\hash\checksum\crc32\crc32.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\checksum\crc32\crc32.cpp /Fo$@

build\obj\lib\hash_comb4p.obj: src\lib\hash\comb4p\comb4p.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\comb4p\comb4p.cpp /Fo$@

build\obj\lib\hash_gost_3411.obj: src\lib\hash\gost_3411\gost_3411.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\gost_3411\gost_3411.cpp /Fo$@

build\obj\lib\hash_has160.obj: src\lib\hash\has160\has160.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\has160\has160.cpp /Fo$@

build\obj\lib\hash.obj: src\lib\hash\hash.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\hash.cpp /Fo$@

build\obj\lib\hash_keccak.obj: src\lib\hash\keccak\keccak.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\keccak\keccak.cpp /Fo$@

build\obj\lib\hash_md2.obj: src\lib\hash\md2\md2.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\md2\md2.cpp /Fo$@

build\obj\lib\hash_md4.obj: src\lib\hash\md4\md4.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\md4\md4.cpp /Fo$@

build\obj\lib\hash_md5.obj: src\lib\hash\md5\md5.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\md5\md5.cpp /Fo$@

build\obj\lib\hash_mdx_hash.obj: src\lib\hash\mdx_hash\mdx_hash.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\mdx_hash\mdx_hash.cpp /Fo$@

build\obj\lib\hash_par_hash.obj: src\lib\hash\par_hash\par_hash.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\par_hash\par_hash.cpp /Fo$@

build\obj\lib\hash_rmd128.obj: src\lib\hash\rmd128\rmd128.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\rmd128\rmd128.cpp /Fo$@

build\obj\lib\hash_rmd160.obj: src\lib\hash\rmd160\rmd160.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\rmd160\rmd160.cpp /Fo$@

build\obj\lib\hash_sha1_sha160.obj: src\lib\hash\sha1\sha160.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\sha1\sha160.cpp /Fo$@

build\obj\lib\hash_sha1_sse2.obj: src\lib\hash\sha1_sse2\sha1_sse2.cpp
	$(CXX)  $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\sha1_sse2\sha1_sse2.cpp /Fo$@

build\obj\lib\hash_sha2_32.obj: src\lib\hash\sha2_32\sha2_32.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\sha2_32\sha2_32.cpp /Fo$@

build\obj\lib\hash_sha2_64.obj: src\lib\hash\sha2_64\sha2_64.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\sha2_64\sha2_64.cpp /Fo$@

build\obj\lib\hash_skein_512.obj: src\lib\hash\skein\skein_512.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\skein\skein_512.cpp /Fo$@

build\obj\lib\hash_tiger_tig_tab.obj: src\lib\hash\tiger\tig_tab.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\tiger\tig_tab.cpp /Fo$@

build\obj\lib\hash_tiger.obj: src\lib\hash\tiger\tiger.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\tiger\tiger.cpp /Fo$@

build\obj\lib\hash_whirlpool.obj: src\lib\hash\whirlpool\whirlpool.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\whirlpool\whirlpool.cpp /Fo$@

build\obj\lib\hash_whirlpool_whrl_tab.obj: src\lib\hash\whirlpool\whrl_tab.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\hash\whirlpool\whrl_tab.cpp /Fo$@

build\obj\lib\kdf_hkdf.obj: src\lib\kdf\hkdf\hkdf.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\kdf\hkdf\hkdf.cpp /Fo$@

build\obj\lib\kdf.obj: src\lib\kdf\kdf.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\kdf\kdf.cpp /Fo$@

build\obj\lib\kdf_kdf1.obj: src\lib\kdf\kdf1\kdf1.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\kdf\kdf1\kdf1.cpp /Fo$@

build\obj\lib\kdf_kdf2.obj: src\lib\kdf\kdf2\kdf2.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\kdf\kdf2\kdf2.cpp /Fo$@

build\obj\lib\kdf_prf_tls.obj: src\lib\kdf\prf_tls\prf_tls.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\kdf\prf_tls\prf_tls.cpp /Fo$@

build\obj\lib\kdf_prf_x942.obj: src\lib\kdf\prf_x942\prf_x942.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\kdf\prf_x942\prf_x942.cpp /Fo$@

build\obj\lib\mac_cbc_mac.obj: src\lib\mac\cbc_mac\cbc_mac.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\mac\cbc_mac\cbc_mac.cpp /Fo$@

build\obj\lib\mac_cmac.obj: src\lib\mac\cmac\cmac.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\mac\cmac\cmac.cpp /Fo$@

build\obj\lib\mac_hmac.obj: src\lib\mac\hmac\hmac.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\mac\hmac\hmac.cpp /Fo$@

build\obj\lib\mac.obj: src\lib\mac\mac.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\mac\mac.cpp /Fo$@

build\obj\lib\mac_poly1305.obj: src\lib\mac\poly1305\poly1305.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\mac\poly1305\poly1305.cpp /Fo$@

build\obj\lib\mac_siphash.obj: src\lib\mac\siphash\siphash.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\mac\siphash\siphash.cpp /Fo$@

build\obj\lib\mac_x919_mac.obj: src\lib\mac\x919_mac\x919_mac.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\mac\x919_mac\x919_mac.cpp /Fo$@

build\obj\lib\math_bigint_big_code.obj: src\lib\math\bigint\big_code.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\bigint\big_code.cpp /Fo$@

build\obj\lib\math_bigint_big_io.obj: src\lib\math\bigint\big_io.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\bigint\big_io.cpp /Fo$@

build\obj\lib\math_bigint_big_ops2.obj: src\lib\math\bigint\big_ops2.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\bigint\big_ops2.cpp /Fo$@

build\obj\lib\math_bigint_big_ops3.obj: src\lib\math\bigint\big_ops3.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\bigint\big_ops3.cpp /Fo$@

build\obj\lib\math_bigint_big_rand.obj: src\lib\math\bigint\big_rand.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\bigint\big_rand.cpp /Fo$@

build\obj\lib\math_bigint.obj: src\lib\math\bigint\bigint.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\bigint\bigint.cpp /Fo$@

build\obj\lib\math_bigint_divide.obj: src\lib\math\bigint\divide.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\bigint\divide.cpp /Fo$@

build\obj\lib\math_ec_gfp_curve_gfp.obj: src\lib\math\ec_gfp\curve_gfp.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\ec_gfp\curve_gfp.cpp /Fo$@

build\obj\lib\math_ec_gfp_curve_nistp.obj: src\lib\math\ec_gfp\curve_nistp.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\ec_gfp\curve_nistp.cpp /Fo$@

build\obj\lib\math_ec_gfp_point_gfp.obj: src\lib\math\ec_gfp\point_gfp.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\ec_gfp\point_gfp.cpp /Fo$@

build\obj\lib\math_mp_asm.obj: src\lib\math\mp\mp_asm.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\mp\mp_asm.cpp /Fo$@

build\obj\lib\math_mp_comba.obj: src\lib\math\mp\mp_comba.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\mp\mp_comba.cpp /Fo$@

build\obj\lib\math_mp_karat.obj: src\lib\math\mp\mp_karat.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\mp\mp_karat.cpp /Fo$@

build\obj\lib\math_mp_misc.obj: src\lib\math\mp\mp_misc.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\mp\mp_misc.cpp /Fo$@

build\obj\lib\math_mp_monty.obj: src\lib\math\mp\mp_monty.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\mp\mp_monty.cpp /Fo$@

build\obj\lib\math_mp_shift.obj: src\lib\math\mp\mp_shift.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\mp\mp_shift.cpp /Fo$@

build\obj\lib\math_numbertheory_dsa_gen.obj: src\lib\math\numbertheory\dsa_gen.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\numbertheory\dsa_gen.cpp /Fo$@

build\obj\lib\math_numbertheory_jacobi.obj: src\lib\math\numbertheory\jacobi.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\numbertheory\jacobi.cpp /Fo$@

build\obj\lib\math_numbertheory_make_prm.obj: src\lib\math\numbertheory\make_prm.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\numbertheory\make_prm.cpp /Fo$@

build\obj\lib\math_numbertheory_mp_numth.obj: src\lib\math\numbertheory\mp_numth.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\numbertheory\mp_numth.cpp /Fo$@

build\obj\lib\math_numbertheory_numthry.obj: src\lib\math\numbertheory\numthry.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\numbertheory\numthry.cpp /Fo$@

build\obj\lib\math_numbertheory_pow_mod.obj: src\lib\math\numbertheory\pow_mod.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\numbertheory\pow_mod.cpp /Fo$@

build\obj\lib\math_numbertheory_powm_fw.obj: src\lib\math\numbertheory\powm_fw.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\numbertheory\powm_fw.cpp /Fo$@

build\obj\lib\math_numbertheory_powm_mnt.obj: src\lib\math\numbertheory\powm_mnt.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\numbertheory\powm_mnt.cpp /Fo$@

build\obj\lib\math_numbertheory_primes.obj: src\lib\math\numbertheory\primes.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\numbertheory\primes.cpp /Fo$@

build\obj\lib\math_numbertheory_reducer.obj: src\lib\math\numbertheory\reducer.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\numbertheory\reducer.cpp /Fo$@

build\obj\lib\math_numbertheory_ressol.obj: src\lib\math\numbertheory\ressol.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\math\numbertheory\ressol.cpp /Fo$@

build\obj\lib\misc_aont_package.obj: src\lib\misc\aont\package.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\misc\aont\package.cpp /Fo$@

build\obj\lib\misc_cryptobox.obj: src\lib\misc\cryptobox\cryptobox.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\misc\cryptobox\cryptobox.cpp /Fo$@

build\obj\lib\misc_fpe_fe1.obj: src\lib\misc\fpe_fe1\fpe_fe1.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\misc\fpe_fe1\fpe_fe1.cpp /Fo$@

build\obj\lib\misc_openpgp.obj: src\lib\misc\openpgp\openpgp.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\misc\openpgp\openpgp.cpp /Fo$@

build\obj\lib\misc_pbes2.obj: src\lib\misc\pbes2\pbes2.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\misc\pbes2\pbes2.cpp /Fo$@

build\obj\lib\misc_pem.obj: src\lib\misc\pem\pem.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\misc\pem\pem.cpp /Fo$@

build\obj\lib\misc_rfc3394.obj: src\lib\misc\rfc3394\rfc3394.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\misc\rfc3394\rfc3394.cpp /Fo$@

build\obj\lib\misc_srp6.obj: src\lib\misc\srp6\srp6.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\misc\srp6\srp6.cpp /Fo$@

build\obj\lib\misc_srp6_files.obj: src\lib\misc\srp6\srp6_files.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\misc\srp6\srp6_files.cpp /Fo$@

build\obj\lib\misc_tss.obj: src\lib\misc\tss\tss.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\misc\tss\tss.cpp /Fo$@

build\obj\lib\modes_aead.obj: src\lib\modes\aead\aead.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\modes\aead\aead.cpp /Fo$@

build\obj\lib\modes_aead_ccm.obj: src\lib\modes\aead\ccm\ccm.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\modes\aead\ccm\ccm.cpp /Fo$@

build\obj\lib\modes_aead_chacha20poly1305.obj: src\lib\modes\aead\chacha20poly1305\chacha20poly1305.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\modes\aead\chacha20poly1305\chacha20poly1305.cpp /Fo$@

build\obj\lib\modes_aead_eax.obj: src\lib\modes\aead\eax\eax.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\modes\aead\eax\eax.cpp /Fo$@

build\obj\lib\modes_aead_gcm_clmul.obj: src\lib\modes\aead\gcm\clmul\clmul.cpp
	$(CXX)  $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\modes\aead\gcm\clmul\clmul.cpp /Fo$@

build\obj\lib\modes_aead_gcm.obj: src\lib\modes\aead\gcm\gcm.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\modes\aead\gcm\gcm.cpp /Fo$@

build\obj\lib\modes_aead_ocb.obj: src\lib\modes\aead\ocb\ocb.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\modes\aead\ocb\ocb.cpp /Fo$@

build\obj\lib\modes_aead_siv.obj: src\lib\modes\aead\siv\siv.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\modes\aead\siv\siv.cpp /Fo$@

build\obj\lib\modes_cbc.obj: src\lib\modes\cbc\cbc.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\modes\cbc\cbc.cpp /Fo$@

build\obj\lib\modes_cfb.obj: src\lib\modes\cfb\cfb.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\modes\cfb\cfb.cpp /Fo$@

build\obj\lib\modes_cipher_mode.obj: src\lib\modes\cipher_mode.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\modes\cipher_mode.cpp /Fo$@

build\obj\lib\modes_ecb.obj: src\lib\modes\ecb\ecb.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\modes\ecb\ecb.cpp /Fo$@

build\obj\lib\modes_mode_pad.obj: src\lib\modes\mode_pad\mode_pad.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\modes\mode_pad\mode_pad.cpp /Fo$@

build\obj\lib\modes_xts.obj: src\lib\modes\xts\xts.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\modes\xts\xts.cpp /Fo$@

build\obj\lib\passhash_bcrypt.obj: src\lib\passhash\bcrypt\bcrypt.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\passhash\bcrypt\bcrypt.cpp /Fo$@

build\obj\lib\passhash_passhash9.obj: src\lib\passhash\passhash9\passhash9.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\passhash\passhash9\passhash9.cpp /Fo$@

build\obj\lib\pbkdf.obj: src\lib\pbkdf\pbkdf.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pbkdf\pbkdf.cpp /Fo$@

build\obj\lib\pbkdf_pbkdf1.obj: src\lib\pbkdf\pbkdf1\pbkdf1.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pbkdf\pbkdf1\pbkdf1.cpp /Fo$@

build\obj\lib\pbkdf_pbkdf2.obj: src\lib\pbkdf\pbkdf2\pbkdf2.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pbkdf\pbkdf2\pbkdf2.cpp /Fo$@

build\obj\lib\pk_pad_eme.obj: src\lib\pk_pad\eme.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pk_pad\eme.cpp /Fo$@

build\obj\lib\pk_pad_eme_oaep_oaep.obj: src\lib\pk_pad\eme_oaep\oaep.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pk_pad\eme_oaep\oaep.cpp /Fo$@

build\obj\lib\pk_pad_eme_pkcs1_eme_pkcs.obj: src\lib\pk_pad\eme_pkcs1\eme_pkcs.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pk_pad\eme_pkcs1\eme_pkcs.cpp /Fo$@

build\obj\lib\pk_pad_eme_raw.obj: src\lib\pk_pad\eme_raw\eme_raw.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pk_pad\eme_raw\eme_raw.cpp /Fo$@

build\obj\lib\pk_pad_emsa.obj: src\lib\pk_pad\emsa.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pk_pad\emsa.cpp /Fo$@

build\obj\lib\pk_pad_emsa1.obj: src\lib\pk_pad\emsa1\emsa1.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pk_pad\emsa1\emsa1.cpp /Fo$@

build\obj\lib\pk_pad_emsa1_bsi.obj: src\lib\pk_pad\emsa1_bsi\emsa1_bsi.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pk_pad\emsa1_bsi\emsa1_bsi.cpp /Fo$@

build\obj\lib\pk_pad_emsa_pkcs1.obj: src\lib\pk_pad\emsa_pkcs1\emsa_pkcs1.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pk_pad\emsa_pkcs1\emsa_pkcs1.cpp /Fo$@

build\obj\lib\pk_pad_emsa_pssr_pssr.obj: src\lib\pk_pad\emsa_pssr\pssr.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pk_pad\emsa_pssr\pssr.cpp /Fo$@

build\obj\lib\pk_pad_emsa_raw.obj: src\lib\pk_pad\emsa_raw\emsa_raw.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pk_pad\emsa_raw\emsa_raw.cpp /Fo$@

build\obj\lib\pk_pad_emsa_x931.obj: src\lib\pk_pad\emsa_x931\emsa_x931.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pk_pad\emsa_x931\emsa_x931.cpp /Fo$@

build\obj\lib\pk_pad_hash_id.obj: src\lib\pk_pad\hash_id\hash_id.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pk_pad\hash_id\hash_id.cpp /Fo$@

build\obj\lib\pk_pad_mgf1.obj: src\lib\pk_pad\mgf1\mgf1.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pk_pad\mgf1\mgf1.cpp /Fo$@

build\obj\lib\pubkey_blinding.obj: src\lib\pubkey\blinding.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\blinding.cpp /Fo$@

build\obj\lib\pubkey_curve25519.obj: src\lib\pubkey\curve25519\curve25519.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\curve25519\curve25519.cpp /Fo$@

build\obj\lib\pubkey_curve25519_donna.obj: src\lib\pubkey\curve25519\donna.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\curve25519\donna.cpp /Fo$@

build\obj\lib\pubkey_dh.obj: src\lib\pubkey\dh\dh.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\dh\dh.cpp /Fo$@

build\obj\lib\pubkey_dl_algo.obj: src\lib\pubkey\dl_algo\dl_algo.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\dl_algo\dl_algo.cpp /Fo$@

build\obj\lib\pubkey_dl_group.obj: src\lib\pubkey\dl_group\dl_group.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\dl_group\dl_group.cpp /Fo$@

build\obj\lib\pubkey_dl_group_named.obj: src\lib\pubkey\dl_group\named.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\dl_group\named.cpp /Fo$@

build\obj\lib\pubkey_dlies.obj: src\lib\pubkey\dlies\dlies.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\dlies\dlies.cpp /Fo$@

build\obj\lib\pubkey_dsa.obj: src\lib\pubkey\dsa\dsa.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\dsa\dsa.cpp /Fo$@

build\obj\lib\pubkey_ec_group.obj: src\lib\pubkey\ec_group\ec_group.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\ec_group\ec_group.cpp /Fo$@

build\obj\lib\pubkey_ec_group_named.obj: src\lib\pubkey\ec_group\named.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\ec_group\named.cpp /Fo$@

build\obj\lib\pubkey_ecc_key.obj: src\lib\pubkey\ecc_key\ecc_key.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\ecc_key\ecc_key.cpp /Fo$@

build\obj\lib\pubkey_ecdh.obj: src\lib\pubkey\ecdh\ecdh.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\ecdh\ecdh.cpp /Fo$@

build\obj\lib\pubkey_ecdsa.obj: src\lib\pubkey\ecdsa\ecdsa.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\ecdsa\ecdsa.cpp /Fo$@

build\obj\lib\pubkey_elgamal.obj: src\lib\pubkey\elgamal\elgamal.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\elgamal\elgamal.cpp /Fo$@

build\obj\lib\pubkey_gost_3410.obj: src\lib\pubkey\gost_3410\gost_3410.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\gost_3410\gost_3410.cpp /Fo$@

build\obj\lib\pubkey_if_algo.obj: src\lib\pubkey\if_algo\if_algo.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\if_algo\if_algo.cpp /Fo$@

build\obj\lib\pubkey_keypair.obj: src\lib\pubkey\keypair\keypair.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\keypair\keypair.cpp /Fo$@

build\obj\lib\pubkey_mce_code_based_key_gen.obj: src\lib\pubkey\mce\code_based_key_gen.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\mce\code_based_key_gen.cpp /Fo$@

build\obj\lib\pubkey_mce_gf2m_rootfind_dcmp.obj: src\lib\pubkey\mce\gf2m_rootfind_dcmp.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\mce\gf2m_rootfind_dcmp.cpp /Fo$@

build\obj\lib\pubkey_mce_gf2m_small_m.obj: src\lib\pubkey\mce\gf2m_small_m.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\mce\gf2m_small_m.cpp /Fo$@

build\obj\lib\pubkey_mce_goppa_code.obj: src\lib\pubkey\mce\goppa_code.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\mce\goppa_code.cpp /Fo$@

build\obj\lib\pubkey_mce_mceliece.obj: src\lib\pubkey\mce\mceliece.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\mce\mceliece.cpp /Fo$@

build\obj\lib\pubkey_mce_mceliece_key.obj: src\lib\pubkey\mce\mceliece_key.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\mce\mceliece_key.cpp /Fo$@

build\obj\lib\pubkey_mce_polyn_gf2m.obj: src\lib\pubkey\mce\polyn_gf2m.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\mce\polyn_gf2m.cpp /Fo$@

build\obj\lib\pubkey_mce_workfactor.obj: src\lib\pubkey\mce\workfactor.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\mce\workfactor.cpp /Fo$@

build\obj\lib\pubkey_mceies.obj: src\lib\pubkey\mceies\mceies.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\mceies\mceies.cpp /Fo$@

build\obj\lib\pubkey_nr.obj: src\lib\pubkey\nr\nr.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\nr\nr.cpp /Fo$@

build\obj\lib\pubkey_pk_algs.obj: src\lib\pubkey\pk_algs.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\pk_algs.cpp /Fo$@

build\obj\lib\pubkey_pk_keys.obj: src\lib\pubkey\pk_keys.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\pk_keys.cpp /Fo$@

build\obj\lib\pubkey_pk_ops.obj: src\lib\pubkey\pk_ops.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\pk_ops.cpp /Fo$@

build\obj\lib\pubkey_pkcs8.obj: src\lib\pubkey\pkcs8.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\pkcs8.cpp /Fo$@

build\obj\lib\pubkey.obj: src\lib\pubkey\pubkey.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\pubkey.cpp /Fo$@

build\obj\lib\pubkey_rfc6979.obj: src\lib\pubkey\rfc6979\rfc6979.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\rfc6979\rfc6979.cpp /Fo$@

build\obj\lib\pubkey_rsa.obj: src\lib\pubkey\rsa\rsa.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\rsa\rsa.cpp /Fo$@

build\obj\lib\pubkey_rw.obj: src\lib\pubkey\rw\rw.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\rw\rw.cpp /Fo$@

build\obj\lib\pubkey_workfactor.obj: src\lib\pubkey\workfactor.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\workfactor.cpp /Fo$@

build\obj\lib\pubkey_x509_key.obj: src\lib\pubkey\x509_key.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\pubkey\x509_key.cpp /Fo$@

build\obj\lib\rng_hmac_drbg.obj: src\lib\rng\hmac_drbg\hmac_drbg.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\rng\hmac_drbg\hmac_drbg.cpp /Fo$@

build\obj\lib\rng_hmac_rng.obj: src\lib\rng\hmac_rng\hmac_rng.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\rng\hmac_rng\hmac_rng.cpp /Fo$@

build\obj\lib\rng.obj: src\lib\rng\rng.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\rng\rng.cpp /Fo$@

build\obj\lib\rng_system_rng.obj: src\lib\rng\system_rng\system_rng.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\rng\system_rng\system_rng.cpp /Fo$@

build\obj\lib\rng_x931_rng.obj: src\lib\rng\x931_rng\x931_rng.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\rng\x931_rng\x931_rng.cpp /Fo$@

build\obj\lib\stream_chacha.obj: src\lib\stream\chacha\chacha.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\stream\chacha\chacha.cpp /Fo$@

build\obj\lib\stream_ctr.obj: src\lib\stream\ctr\ctr.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\stream\ctr\ctr.cpp /Fo$@

build\obj\lib\stream_ofb.obj: src\lib\stream\ofb\ofb.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\stream\ofb\ofb.cpp /Fo$@

build\obj\lib\stream_rc4.obj: src\lib\stream\rc4\rc4.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\stream\rc4\rc4.cpp /Fo$@

build\obj\lib\stream_salsa20.obj: src\lib\stream\salsa20\salsa20.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\stream\salsa20\salsa20.cpp /Fo$@

build\obj\lib\stream_cipher.obj: src\lib\stream\stream_cipher.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\stream\stream_cipher.cpp /Fo$@

build\obj\lib\tls_credentials_manager.obj: src\lib\tls\credentials_manager.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\credentials_manager.cpp /Fo$@

build\obj\lib\tls_msg_cert_req.obj: src\lib\tls\msg_cert_req.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\msg_cert_req.cpp /Fo$@

build\obj\lib\tls_msg_cert_verify.obj: src\lib\tls\msg_cert_verify.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\msg_cert_verify.cpp /Fo$@

build\obj\lib\tls_msg_certificate.obj: src\lib\tls\msg_certificate.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\msg_certificate.cpp /Fo$@

build\obj\lib\tls_msg_client_hello.obj: src\lib\tls\msg_client_hello.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\msg_client_hello.cpp /Fo$@

build\obj\lib\tls_msg_client_kex.obj: src\lib\tls\msg_client_kex.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\msg_client_kex.cpp /Fo$@

build\obj\lib\tls_msg_finished.obj: src\lib\tls\msg_finished.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\msg_finished.cpp /Fo$@

build\obj\lib\tls_msg_hello_verify.obj: src\lib\tls\msg_hello_verify.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\msg_hello_verify.cpp /Fo$@

build\obj\lib\tls_msg_server_hello.obj: src\lib\tls\msg_server_hello.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\msg_server_hello.cpp /Fo$@

build\obj\lib\tls_msg_server_kex.obj: src\lib\tls\msg_server_kex.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\msg_server_kex.cpp /Fo$@

build\obj\lib\tls_msg_session_ticket.obj: src\lib\tls\msg_session_ticket.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\msg_session_ticket.cpp /Fo$@

build\obj\lib\tls_sessions_sql_tls_session_manager_sql.obj: src\lib\tls\sessions_sql\tls_session_manager_sql.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\sessions_sql\tls_session_manager_sql.cpp /Fo$@

build\obj\lib\tls_alert.obj: src\lib\tls\tls_alert.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\tls_alert.cpp /Fo$@

build\obj\lib\tls_blocking.obj: src\lib\tls\tls_blocking.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\tls_blocking.cpp /Fo$@

build\obj\lib\tls_channel.obj: src\lib\tls\tls_channel.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\tls_channel.cpp /Fo$@

build\obj\lib\tls_ciphersuite.obj: src\lib\tls\tls_ciphersuite.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\tls_ciphersuite.cpp /Fo$@

build\obj\lib\tls_client.obj: src\lib\tls\tls_client.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\tls_client.cpp /Fo$@

build\obj\lib\tls_extensions.obj: src\lib\tls\tls_extensions.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\tls_extensions.cpp /Fo$@

build\obj\lib\tls_handshake_hash.obj: src\lib\tls\tls_handshake_hash.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\tls_handshake_hash.cpp /Fo$@

build\obj\lib\tls_handshake_io.obj: src\lib\tls\tls_handshake_io.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\tls_handshake_io.cpp /Fo$@

build\obj\lib\tls_handshake_state.obj: src\lib\tls\tls_handshake_state.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\tls_handshake_state.cpp /Fo$@

build\obj\lib\tls_heartbeats.obj: src\lib\tls\tls_heartbeats.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\tls_heartbeats.cpp /Fo$@

build\obj\lib\tls_policy.obj: src\lib\tls\tls_policy.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\tls_policy.cpp /Fo$@

build\obj\lib\tls_record.obj: src\lib\tls\tls_record.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\tls_record.cpp /Fo$@

build\obj\lib\tls_server.obj: src\lib\tls\tls_server.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\tls_server.cpp /Fo$@

build\obj\lib\tls_session.obj: src\lib\tls\tls_session.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\tls_session.cpp /Fo$@

build\obj\lib\tls_session_key.obj: src\lib\tls\tls_session_key.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\tls_session_key.cpp /Fo$@

build\obj\lib\tls_session_manager_memory.obj: src\lib\tls\tls_session_manager_memory.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\tls_session_manager_memory.cpp /Fo$@

build\obj\lib\tls_suite_info.obj: src\lib\tls\tls_suite_info.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\tls_suite_info.cpp /Fo$@

build\obj\lib\tls_version.obj: src\lib\tls\tls_version.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\tls\tls_version.cpp /Fo$@

build\obj\lib\utils_assert.obj: src\lib\utils\assert.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\utils\assert.cpp /Fo$@

build\obj\lib\utils_calendar.obj: src\lib\utils\calendar.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\utils\calendar.cpp /Fo$@

build\obj\lib\utils_charset.obj: src\lib\utils\charset.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\utils\charset.cpp /Fo$@

build\obj\lib\utils_cpuid.obj: src\lib\utils\cpuid.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\utils\cpuid.cpp /Fo$@

build\obj\lib\utils_data_src.obj: src\lib\utils\data_src.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\utils\data_src.cpp /Fo$@

build\obj\lib\utils_datastor.obj: src\lib\utils\datastor\datastor.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\utils\datastor\datastor.cpp /Fo$@

build\obj\lib\utils_filesystem.obj: src\lib\utils\filesystem.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\utils\filesystem.cpp /Fo$@

build\obj\lib\utils_http_util.obj: src\lib\utils\http_util\http_util.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\utils\http_util\http_util.cpp /Fo$@

build\obj\lib\utils_locking_allocator.obj: src\lib\utils\locking_allocator\locking_allocator.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\utils\locking_allocator\locking_allocator.cpp /Fo$@

build\obj\lib\utils_os_utils.obj: src\lib\utils\os_utils.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\utils\os_utils.cpp /Fo$@

build\obj\lib\utils_parsing.obj: src\lib\utils\parsing.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\utils\parsing.cpp /Fo$@

build\obj\lib\utils_read_cfg.obj: src\lib\utils\read_cfg.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\utils\read_cfg.cpp /Fo$@

build\obj\lib\utils_semaphore.obj: src\lib\utils\semaphore.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\utils\semaphore.cpp /Fo$@

build\obj\lib\utils_version.obj: src\lib\utils\version.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\utils\version.cpp /Fo$@

build\obj\lib\utils_zero_mem.obj: src\lib\utils\zero_mem.cpp
	$(CXX) $(LIB_FLAGS) /Ibuild\include /nologo /c src\lib\utils\zero_mem.cpp /Fo$@


build\obj\cli\asn1.obj: src\cli\asn1.cpp
	$(CXX) $(CLI_FLAGS) /Ibuild\include /nologo /c src\cli\asn1.cpp /Fo$@

build\obj\cli\bench.obj: src\cli\bench.cpp
	$(CXX) $(CLI_FLAGS) /Ibuild\include /nologo /c src\cli\bench.cpp /Fo$@

build\obj\cli\cc_enc.obj: src\cli\cc_enc.cpp
	$(CXX) $(CLI_FLAGS) /Ibuild\include /nologo /c src\cli\cc_enc.cpp /Fo$@

build\obj\cli\compress.obj: src\cli\compress.cpp
	$(CXX) $(CLI_FLAGS) /Ibuild\include /nologo /c src\cli\compress.cpp /Fo$@

build\obj\cli\main.obj: src\cli\main.cpp
	$(CXX) $(CLI_FLAGS) /Ibuild\include /nologo /c src\cli\main.cpp /Fo$@

build\obj\cli\math.obj: src\cli\math.cpp
	$(CXX) $(CLI_FLAGS) /Ibuild\include /nologo /c src\cli\math.cpp /Fo$@

build\obj\cli\pubkey.obj: src\cli\pubkey.cpp
	$(CXX) $(CLI_FLAGS) /Ibuild\include /nologo /c src\cli\pubkey.cpp /Fo$@

build\obj\cli\tls_client.obj: src\cli\tls_client.cpp
	$(CXX) $(CLI_FLAGS) /Ibuild\include /nologo /c src\cli\tls_client.cpp /Fo$@

build\obj\cli\tls_proxy.obj: src\cli\tls_proxy.cpp
	$(CXX) $(CLI_FLAGS) /Ibuild\include /nologo /c src\cli\tls_proxy.cpp /Fo$@

build\obj\cli\tls_server.obj: src\cli\tls_server.cpp
	$(CXX) $(CLI_FLAGS) /Ibuild\include /nologo /c src\cli\tls_server.cpp /Fo$@

build\obj\cli\utils.obj: src\cli\utils.cpp
	$(CXX) $(CLI_FLAGS) /Ibuild\include /nologo /c src\cli\utils.cpp /Fo$@

build\obj\cli\x509.obj: src\cli\x509.cpp
	$(CXX) $(CLI_FLAGS) /Ibuild\include /nologo /c src\cli\x509.cpp /Fo$@


build\obj\test\main.obj: src\tests\main.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\main.cpp /Fo$@

build\obj\test\tests.obj: src\tests\tests.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\tests.cpp /Fo$@

build\obj\test\test_aead.obj: src\tests\test_aead.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_aead.cpp /Fo$@

build\obj\test\test_bigint.obj: src\tests\test_bigint.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_bigint.cpp /Fo$@

build\obj\test\test_block.obj: src\tests\test_block.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_block.cpp /Fo$@

build\obj\test\test_c25519.obj: src\tests\test_c25519.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_c25519.cpp /Fo$@

build\obj\test\test_compression.obj: src\tests\test_compression.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_compression.cpp /Fo$@

build\obj\test\test_cryptobox.obj: src\tests\test_cryptobox.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_cryptobox.cpp /Fo$@

build\obj\test\test_cvc.obj: src\tests\test_cvc.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_cvc.cpp /Fo$@

build\obj\test\test_dh.obj: src\tests\test_dh.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_dh.cpp /Fo$@

build\obj\test\test_dlies.obj: src\tests\test_dlies.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_dlies.cpp /Fo$@

build\obj\test\test_dsa.obj: src\tests\test_dsa.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_dsa.cpp /Fo$@

build\obj\test\test_ecc_pointmul.obj: src\tests\test_ecc_pointmul.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_ecc_pointmul.cpp /Fo$@

build\obj\test\test_ecdh.obj: src\tests\test_ecdh.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_ecdh.cpp /Fo$@

build\obj\test\test_ecdsa.obj: src\tests\test_ecdsa.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_ecdsa.cpp /Fo$@

build\obj\test\test_elg.obj: src\tests\test_elg.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_elg.cpp /Fo$@

build\obj\test\test_entropy.obj: src\tests\test_entropy.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_entropy.cpp /Fo$@

build\obj\test\test_ffi.obj: src\tests\test_ffi.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_ffi.cpp /Fo$@

build\obj\test\test_fuzzer.obj: src\tests\test_fuzzer.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_fuzzer.cpp /Fo$@

build\obj\test\test_gf2m.obj: src\tests\test_gf2m.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_gf2m.cpp /Fo$@

build\obj\test\test_gost_3410.obj: src\tests\test_gost_3410.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_gost_3410.cpp /Fo$@

build\obj\test\test_hash.obj: src\tests\test_hash.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_hash.cpp /Fo$@

build\obj\test\test_kdf.obj: src\tests\test_kdf.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_kdf.cpp /Fo$@

build\obj\test\test_keywrap.obj: src\tests\test_keywrap.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_keywrap.cpp /Fo$@

build\obj\test\test_mac.obj: src\tests\test_mac.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_mac.cpp /Fo$@

build\obj\test\test_mceliece.obj: src\tests\test_mceliece.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_mceliece.cpp /Fo$@

build\obj\test\test_modes.obj: src\tests\test_modes.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_modes.cpp /Fo$@

build\obj\test\test_nr.obj: src\tests\test_nr.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_nr.cpp /Fo$@

build\obj\test\test_ocb.obj: src\tests\test_ocb.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_ocb.cpp /Fo$@

build\obj\test\test_passhash.obj: src\tests\test_passhash.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_passhash.cpp /Fo$@

build\obj\test\test_pbkdf.obj: src\tests\test_pbkdf.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_pbkdf.cpp /Fo$@

build\obj\test\test_pubkey.obj: src\tests\test_pubkey.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_pubkey.cpp /Fo$@

build\obj\test\test_rfc6979.obj: src\tests\test_rfc6979.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_rfc6979.cpp /Fo$@

build\obj\test\test_rng.obj: src\tests\test_rng.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_rng.cpp /Fo$@

build\obj\test\test_rsa.obj: src\tests\test_rsa.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_rsa.cpp /Fo$@

build\obj\test\test_rw.obj: src\tests\test_rw.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_rw.cpp /Fo$@

build\obj\test\test_srp6.obj: src\tests\test_srp6.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_srp6.cpp /Fo$@

build\obj\test\test_stream.obj: src\tests\test_stream.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_stream.cpp /Fo$@

build\obj\test\test_tss.obj: src\tests\test_tss.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_tss.cpp /Fo$@

build\obj\test\test_utils.obj: src\tests\test_utils.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_utils.cpp /Fo$@

build\obj\test\test_x509_path.obj: src\tests\test_x509_path.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\test_x509_path.cpp /Fo$@

build\obj\test\unit_ecc.obj: src\tests\unit_ecc.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\unit_ecc.cpp /Fo$@

build\obj\test\unit_ecdh.obj: src\tests\unit_ecdh.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\unit_ecdh.cpp /Fo$@

build\obj\test\unit_ecdsa.obj: src\tests\unit_ecdsa.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\unit_ecdsa.cpp /Fo$@

build\obj\test\unit_tls.obj: src\tests\unit_tls.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\unit_tls.cpp /Fo$@

build\obj\test\unit_x509.obj: src\tests\unit_x509.cpp
	$(CXX) $(TEST_FLAGS) /Ibuild\include /nologo /c src\tests\unit_x509.cpp /Fo$@


# Link Commands
$(CLI): $(LIBRARIES) $(CLIOBJS)
	$(CLI_LINK_CMD) /OUT:$@ $(CLIOBJS) $(LIB_FILENAME) $(CLI_LINKS_TO)
	$(CLI_POST_LINK_CMD)

$(TEST): $(LIBRARIES) $(TESTOBJS)
	$(TEST_LINK_CMD) /OUT:$@ $(TESTOBJS) $(LIB_FILENAME) $(TEST_LINKS_TO)
	$(TEST_POST_LINK_CMD)

!If "$(SO_OBJ_FLAGS)" == ""
# static lib
$(LIB_FILENAME): $(LIBOBJS)
	$(AR) /OUT:$@ $(LIBOBJS)
!Else
# shared lib
# Creates the DLL $(SO_FILENAME) and the .lib $(LIB_FILENAME)
$(SO_FILENAME): $(LIBOBJS)
	$(LIB_LINK_CMD) /OUT:$@ $(LIBOBJS) $(LIB_LINKS_TO)
!Endif

# Fake Targets

SPHINX_CONFIG = src\build-data\sphinx
SPHINX_OPTS = -b html

docs:
	$(COPY) doc\manual\*.rst build\docs\manual

clean:
	-$(RM) build\obj\lib\*
	-$(RM) build\obj\cli\*
	-$(RM) build\obj\test\*
	-$(RM) .\*.manifest
	-$(RM) .\*.exp
	-$(RM) .\*.dll
	-$(RM) $(LIBRARIES) $(CLI) $(TEST)

distclean: clean
	$(RM_R) build
	$(RMDIR) build\include\botan\internal
	$(RMDIR) build\include\botan
	$(RMDIR) build\include
	$(RMDIR) build\lib build\tests
	$(RMDIR) build
	$(RM) Makefile $(LIB_BASENAME).* $(CLI).*

install: $(CLI) docs
	$(SCRIPTS_DIR)\install.py --destdir=c:\Botan --build-dir="build" --bindir=bin --libdir=lib --docdir=docs --includedir=include
