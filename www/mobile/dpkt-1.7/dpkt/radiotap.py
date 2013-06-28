'''Radiotap'''

import dpkt

# Ref: http://www.radiotap.org
# Fields Ref: http://www.radiotap.org/defined-fields/all

# Present flags
_TSFT_MASK            = 0x1000000
_FLAGS_MASK           = 0x2000000
_RATE_MASK            = 0x4000000
_CHANNEL_MASK         = 0x8000000
_FHSS_MASK            = 0x10000000
_ANT_SIG_MASK         = 0x20000000
_ANT_NOISE_MASK       = 0x40000000
_LOCK_QUAL_MASK       = 0x80000000
_TX_ATTN_MASK         = 0x10000
_DB_TX_ATTN_MASK      = 0x20000
_DBM_TX_POWER_MASK    = 0x40000
_ANTENNA_MASK         = 0x80000
_DB_ANT_SIG_MASK      = 0x100000
_DB_ANT_NOISE_MASK    = 0x200000
_RX_FLAGS_MASK        = 0x400000
_CHANNELPLUS_MASK     = 0x200
_EXT_MASK             = 0x1

_TSFT_SHIFT           = 24
_FLAGS_SHIFT          = 25
_RATE_SHIFT           = 26
_CHANNEL_SHIFT        = 27
_FHSS_SHIFT           = 28
_ANT_SIG_SHIFT        = 29
_ANT_NOISE_SHIFT      = 30
_LOCK_QUAL_SHIFT      = 31
_TX_ATTN_SHIFT        = 16
_DB_TX_ATTN_SHIFT     = 17
_DBM_TX_POWER_SHIFT   = 18
_ANTENNA_SHIFT        = 19
_DB_ANT_SIG_SHIFT     = 20
_DB_ANT_NOISE_SHIFT   = 21
_RX_FLAGS_SHIFT       = 22
_CHANNELPLUS_SHIFT    = 10
_EXT_SHIFT            = 0

# Flags elements
_FLAGS_SIZE           = 2
_CFP_FLAG_SHIFT       = 0
_PREAMBLE_SHIFT       = 1
_WEP_SHIFT            = 2
_FRAG_SHIFT           = 3
_FCS_SHIFT            = 4
_DATA_PAD_SHIFT       = 5
_BAD_FCS_SHIFT        = 6
_SHORT_GI_SHIFT       = 7

# Channel type
_CHAN_TYPE_SIZE       = 4
_CHANNEL_TYPE_SHIFT   = 4
_CCK_SHIFT            = 5
_OFDM_SHIFT           = 6
_TWO_GHZ_SHIFT        = 7
_FIVE_GHZ_SHIFT       = 8
_PASSIVE_SHIFT        = 9
_DYN_CCK_OFDM_SHIFT   = 10
_GFSK_SHIFT           = 11
_GSM_SHIFT            = 12
_STATIC_TURBO_SHIFT   = 13
_HALF_RATE_SHIFT      = 14
_QUARTER_RATE_SHIFT   = 15

class Radiotap(dpkt.Packet):
    __hdr__ = (
        ('version', 'B', 0),
        ('pad', 'B', 0),
        ('length', 'H', 0),
        ('present_flags', 'I', 0)
        )

    def _get_tsft_present(self): return (self.present_flags & _TSFT_MASK) >> _TSFT_SHIFT
    def _set_tsft_present(self, val): self.present_flags = self.present_flags | (val << _TSFT_SHIFT)
    def _get_flags_present(self): return (self.present_flags & _FLAGS_MASK) >> _FLAGS_SHIFT
    def _set_flags_present(self, val): self.present_flags = self.present_flags | (val << _FLAGS_SHIFT)
    def _get_rate_present(self): return (self.present_flags & _RATE_MASK) >> _RATE_SHIFT
    def _set_rate_present(self, val): self.present_flags = self.present_flags | (val <<    _RATE_SHIFT)
    def _get_channel_present(self): return (self.present_flags & _CHANNEL_MASK) >> _CHANNEL_SHIFT
    def _set_channel_present(self, val): self.present_flags = self.present_flags | (val << _CHANNEL_SHIFT)
    def _get_fhss_present(self): return (self.present_flags & _FHSS_MASK) >> _FHSS_SHIFT
    def _set_fhss_present(self, val): self.present_flags = self.present_flags | (val << _FHSS_SHIFT)
    def _get_ant_sig_present(self): return (self.present_flags & _ANT_SIG_MASK) >> _ANT_SIG_SHIFT
    def _set_ant_sig_present(self, val): self.present_flags = self.present_flags | (val << _ANT_SIG_SHIFT)
    def _get_ant_noise_present(self): return (self.present_flags & _ANT_NOISE_MASK) >> _ANT_NOISE_SHIFT
    def _set_ant_noise_present(self, val): self.present_flags = self.present_flags | (val << _ANT_NOISE_SHIFT)
    def _get_lock_qual_present(self): return (self.present_flags & _LOCK_QUAL_MASK) >> _LOCK_QUAL_SHIFT
    def _set_lock_qual_present(self, val): self.present_flags = self.present_flags | (val << _LOCK_QUAL_SHIFT)
    def _get_tx_attn_present(self): return (self.present_flags & _TX_ATTN_MASK) >> _TX_ATTN_SHIFT
    def _set_tx_attn_present(self, val): self.present_flags = self.present_flags | (val  << _TX_ATTN_SHIFT)
    def _get_db_tx_attn_present(self): return (self.present_flags & _DB_TX_ATTN_MASK) >> _DB_TX_ATTN_SHIFT
    def _set_db_tx_attn_present(self, val): self.present_flags = self.present_flags | (val << _DB_TX_ATTN_SHIFT)
    def _get_dbm_power_present(self): return (self.present_flags & _DBM_TX_POWER_MASK) >> _DBM_TX_POWER_SHIFT
    def _set_dbm_power_present(self, val): self.present_flags = self.present_flags | (val << _DBM_TX_POWER_SHIFT)
    def _get_ant_present(self): return (self.present_flags & _ANTENNA_MASK) >> _ANTENNA_SHIFT
    def _set_ant_present(self, val): self.present_flags = self.present_flags | (val << _ANTENNA_SHIFT)
    def _get_db_ant_sig_present(self): return (self.present_flags & _DB_ANT_SIG_MASK) >> _DB_ANT_SIG_SHIFT
    def _set_db_ant_sig_present(self, val): self.present_flags = self.present_flags | (val << _DB_ANT_SIG_SHIFT)
    def _get_db_ant_noise_present(self): return (self.present_flags & _DB_ANT_NOISE_MASK) >> _DB_ANT_NOISE_SHIFT
    def _set_db_ant_noise_present(self, val): self.present_flags =    self.present_flags | (val << _DB_ANT_NOISE_SHIFT)
    def _get_rx_flags_present(self): return (self.present_flags & _RX_FLAGS_MASK) >> _RX_FLAGS_SHIFT
    def _set_rx_flags_present(self, val): self.present_flags = self.present_flags | (val << _RX_FLAGS_SHIFT)
    def _get_chanplus_present(self): return (self.present_flags & _CHANNELPLUS_MASK) >> _CHANNELPLUS_SHIFT
    def _set_chanplus_present(self, val): self.present_flags = self.present_flags | (val << _CHANNELPLUS_SHIFT)
    def _get_ext_present(self): return (self.present_flags & _EXT_MASK) >> _EXT_SHIFT
    def _set_ext_present(self, val): self.present_flags = self.present_flags | (val << _EXT_SHIFT)

    tsft_present = property(_get_tsft_present, _set_tsft_present)
    flags_present = property(_get_flags_present, _set_flags_present)
    rate_present = property(_get_rate_present, _set_rate_present)
    channel_present = property(_get_channel_present, _set_channel_present)
    fhss_present = property(_get_fhss_present, _set_fhss_present)
    ant_sig_present = property(_get_ant_sig_present, _set_ant_sig_present)
    ant_noise_present = property(_get_ant_noise_present, _set_ant_noise_present)
    lock_qual_present = property(_get_lock_qual_present, _set_lock_qual_present)
    tx_attn_present = property(_get_tx_attn_present, _set_tx_attn_present)
    db_tx_attn_present = property(_get_db_tx_attn_present, _set_db_tx_attn_present)
    dbm_tx_power_present = property(_get_dbm_power_present, _set_dbm_power_present)
    ant_present = property(_get_ant_present, _set_ant_present)
    db_ant_sig_present = property(_get_db_ant_sig_present, _set_db_ant_sig_present)
    db_ant_noise_present = property(_get_db_ant_noise_present, _set_db_ant_noise_present)
    rx_flags_present = property(_get_rx_flags_present, _set_rx_flags_present)
    chanplus_present = property(_get_chanplus_present, _set_chanplus_present)
    ext_present = property(_get_ext_present, _set_ext_present)
    
    def unpack(self, buf):
        dpkt.Packet.unpack(self, buf)
        self.data = buf[self.length:]
        
        self.fields = []
        buf = buf[self.__hdr_len__:]

        # decode each field into self.<name> (eg. self.tsft) as well as append it self.fields list
        field_decoder = [
            ('tsft', self.tsft_present, self.TSFT),
            ('flags', self.flags_present, self.Flags),
            ('rate', self.rate_present, self.Rate),
            ('channel', self.channel_present, self.Channel),
            ('fhss', self.fhss_present, self.FHSS),
            ('ant_sig', self.ant_sig_present, self.AntennaSignal),
            ('ant_noise', self.ant_noise_present, self.AntennaNoise),
            ('lock_qual', self.lock_qual_present, self.LockQuality),
            ('tx_attn', self.tx_attn_present, self.TxAttenuation),
            ('db_tx_attn', self.db_tx_attn_present, self.DbTxAttenuation),
            ('dbm_tx_power', self.dbm_tx_power_present, self.DbmTxPower),
            ('ant', self.ant_present, self.Antenna),
            ('db_ant_sig', self.db_ant_sig_present, self.DbAntennaSignal),
            ('db_ant_noise', self.db_ant_noise_present, self.DbAntennaNoise),
            ('rx_flags', self.rx_flags_present, self.RxFlags)
        ]
        for name, present_bit, parser in field_decoder:
            if present_bit:
                field = parser(buf)
                field.data = ''
                setattr(self, name, field)
                self.fields.append(field)
                buf = buf[len(field):]

    class Antenna(dpkt.Packet):
        __hdr__ = (
            ('index', 'B',  0),
            )

    class AntennaNoise(dpkt.Packet):
        __hdr__ = (
            ('db', 'B', 0),
            )

    class AntennaSignal(dpkt.Packet):
        __hdr__ = (
            ('db',  'B', 0),
            )

    class Channel(dpkt.Packet):
        __hdr__ = (
            ('freq', 'H', 0),
            ('flags', 'H',  0),
            )

    class FHSS(dpkt.Packet):
        __hdr__ = (
            ('set', 'B', 0),
            ('pattern', 'B', 0),
            )

    class Flags(dpkt.Packet):
        __hdr__ = (
            ('val', 'B', 0),
            )

    class LockQuality(dpkt.Packet):
        __hdr__ = (
            ('val', 'H', 0),
            )

    class RxFlags(dpkt.Packet):
        __hdr__ = (
            ('val', 'H', 0),
            )

    class Rate(dpkt.Packet):
        __hdr__ = (
            ('val', 'B', 0),
            )

    class TSFT(dpkt.Packet):
        __hdr__ = (
            ('usecs', 'Q', 0),
            )

    class TxAttenuation(dpkt.Packet):
        __hdr__ = (
            ('val',  'H', 0),
            )

    class DbTxAttenuation(dpkt.Packet):
        __hdr__ = (
            ('db', 'H', 0),
            )

    class DbAntennaNoise(dpkt.Packet):
        __hdr__ = (
            ('db', 'B', 0),
            )

    class DbAntennaSignal(dpkt.Packet):
        __hdr__ = (
            ('db', 'B', 0),
            )

    class DbmTxPower(dpkt.Packet):
        __hdr__ = (
            ('dbm', 'B', 0),
            )

if __name__ == '__main__':
    import unittest

    class RadiotapTestCase(unittest.TestCase):
        def test_Radiotap(self):
            s = '\x00\x00\x00\x18\x6e\x48\x00\x00\x00\x02\x6c\x09\xa0\x00\xa8\x81\x02\x00\x00\x00\x00\x00\x00\x00'
            rad = Radiotap(s)
            self.failUnless(rad.version == 0)
            self.failUnless(rad.present_flags == 0x6e480000)
            self.failUnless(rad.tsft_present == 0)
            self.failUnless(rad.flags_present == 1)
            self.failUnless(rad.rate_present == 1)
            self.failUnless(rad.channel_present == 1)
            self.failUnless(rad.fhss_present == 0)
            self.failUnless(rad.ant_sig_present == 1)
            self.failUnless(rad.ant_noise_present == 1)
            self.failUnless(rad.lock_qual_present == 0)
            self.failUnless(rad.db_tx_attn_present == 0)
            self.failUnless(rad.dbm_tx_power_present == 0)
            self.failUnless(rad.ant_present == 1)
            self.failUnless(rad.db_ant_sig_present == 0)
            self.failUnless(rad.db_ant_noise_present == 0)
            self.failUnless(rad.rx_flags_present == 1)
            self.failUnless(rad.channel.freq == 0x6c09)
            self.failUnless(rad.channel.flags == 0xa000)
            self.failUnless(len(rad.fields) == 7)
    unittest.main()
