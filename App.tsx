import 'react-native-gesture-handler';
import * as React from 'react';
import {ScrollView, Image, TouchableOpacity} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {Alert, Modal, StyleSheet, Text, Pressable, View} from 'react-native';
import ReclaimHttps from '@reclaimprotocol/reclaim-react-native/ReclaimHttps';
import {SafeAreaView} from 'react-native-safe-area-context';

function compare(a, b) {
  if (a.playtime_forever > b.playtime_forever) {
    return -1;
  }
  if (a.playtime_forever < b.playtime_forever) {
    return 1;
  }
  return 0;
}

function CustomButton({onPress, title}: {onPress: () => void; title: string}) {
  return (
    <TouchableOpacity
      activeOpacity={0.5}
      onPress={onPress}
      style={[styles.button, styles.buttonFlexBox]}>
      <View style={[styles.content, styles.buttonFlexBox]}>
        <Text style={[styles.label, styles.labelTypo]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

function CustomModal({modalVisible, setModalVisible, achievements}: any) {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => {
        Alert.alert('Modal has been closed.');
        setModalVisible(!modalVisible);
      }}>
      <ScrollView style={styles.centeredView}>
        <CustomButton
          title="Back"
          onPress={() => setModalVisible(!modalVisible)}
        />

        <View style={styles.modalView}>
          {achievements &&
            achievements.map(achievement => (
              <>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Image
                      source={{
                        uri: `${achievement.icon}`,
                      }}
                      style={{width: 70, height: 70}}
                    />
                  </View>
                  <View style={{width: '60%'}}>
                    <Text style={styles.gameName}>{achievement.name}</Text>
                    <Text style={{flex: 1, flexWrap: 'wrap'}}>
                      description: {achievement.description}
                    </Text>
                  </View>
                </View>
              </>
            ))}
        </View>
      </ScrollView>
    </Modal>
  );
}

function HomeScreen() {
  const [isProofReceived, setIsProofReceived] = React.useState(false);
  const [steamId, setSteamId] = React.useState(null);
  const [errorCount, setErrorCount] = React.useState(0);
  const [details, setDetails] = React.useState(false);
  return (
    <SafeAreaView style={styles.container}>
      {!details && (
        <>
          <ReclaimHttps
            key={errorCount}
            requestedProofs={[
              {
                url: 'https://store.steampowered.com/account/',
                loginUrl:
                  'https://store.steampowered.com/login/?redir=account%2F&redir_ssl=1',
                loginCookies: ['steamLoginSecure'],
                responseSelections: [
                  {
                    responseMatch: 'Steam ID: {{steamId}}<',
                  },
                ],
              },
            ]}
            // context="Proving on 2023 for eth India"
            title="Steam"
            subTitle="Prove you have a Steam Account"
            cta="Prove"
            onSuccess={proofs => {
              setIsProofReceived(true);
              //@ts-ignore
              setSteamId(proofs[0].extractedParameterValues.steamId);
            }}
            onFail={e => {
              /*do something*/
              console.log('Error', e);
            }}
            //@ts-ignore
            onStatusChange={(text: string) => {
              console.log('from on Status change, the status is: ', text);
            }}
          />
          <View style={styles.buttonContainer}>
            <CustomButton
              title="Reset"
              onPress={() => setErrorCount(errorCount + 1)}
            />
          </View>
        </>
      )}

      {details && (
        <>
          <DetailsScreen steamId={steamId} />
        </>
      )}

      {isProofReceived && (
        <View style={styles.buttonContainer}>
          <CustomButton
            title={details ? 'Go back' : 'View Claimed Profile'}
            onPress={() => setDetails(!details)}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function DetailsScreen({steamId}: {steamId: any}) {
  const [games, setGames] = React.useState(undefined);
  const [profile, setProfile] = React.useState(undefined);
  const [achievements, setAchievements] = React.useState(undefined);
  const [modalVisible, setModalVisible] = React.useState(false);

  React.useEffect(() => {
    console.log('Steam ID: ', steamId);
    // const steamId2 = '76561198873872015';

    const acheivementMetadataFetcher = async (appId: any) => {
      const url = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${process.env.key}&appid=${appId}&l=english`;
      const response = await fetch(url);
      const data = (await response.json()).game;
      const achievements = data.availableGameStats?.achievements ?? [];
      return achievements;
    };

    const acheivementFetcher = async (appId: any) => {
      const url = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appId}&key=${process.env.key}&steamid=${steamId}`;
      const response = await fetch(url);

      const data = (await response.json()).playerstats;

      const metadata = await acheivementMetadataFetcher(appId);
      // console.log('metadata', metadata);
      const achievements = data.achievements ?? [];

      const calcAchievements = [];
      let total = 0;
      for (let i = 0; i < achievements.length; i++) {
        if (achievements[i].achieved) {
          // console.log(achievements);

          total++;
          calcAchievements.push({
            name: metadata[i].displayName ?? '',
            achieved: achievements[i].achieved,
            unlockTime: achievements[i].unlocktime,
            description: metadata[i].description ?? '',
            icon: metadata[i].icon ?? '',
          });
        }
      }
      return {
        total: total,
        achievements: calcAchievements,
      };
    };

    const fetcher = async () => {
      const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.key}&steamid=${steamId}
&format=json&include_appinfo=1`;
      const response = await fetch(url);
      const data = (await response.json()).response;
      let games = data.games === undefined ? [] : data.games;
      games = games.sort(compare);
      for (let i = 0; i < games.length; i++) {
        const game = games[i];
        const achievements = await acheivementFetcher(game.appid);
        game.achievements = achievements;
      }
      console.log('Games: ', games);
      setGames(games);
    };
    const profileFetcher = async () => {
      const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${process.env.key}&steamids=${steamId}`;
      const response = await fetch(url);
      const data = (await response.json()).response;

      setProfile(data.players[0]);
    };

    fetcher();
    profileFetcher();
  }, [steamId]);

  return (
    <>
      {profile === undefined && <Text>Loading Profile...</Text>}
      {profile !== undefined && (
        <View style={[{alignItems: 'center', paddingTop: 10, gap: 10}]}>
          <Image
            source={{uri: profile.avatarmedium}}
            style={{width: 70, height: 70}}
          />
          <Text style={{textAlign: 'center', fontSize: 16, fontWeight: '700'}}>
            {profile.personaname}
          </Text>
          {games !== undefined && (
            <Text style={{textAlign: 'center', margin: 1}}>
              {games.length!} Game{games.length > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      )}
      <CustomModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        achievements={achievements}
      />
      {games === undefined && <Text>Loading Games...</Text>}
      {games !== undefined && (
        <ScrollView style={{width: '100%'}}>
          {
            //@ts-ignore
            games.map(game => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Image
                    source={{
                      uri: `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`,
                    }}
                    style={{width: 70, height: 70}}
                  />
                </View>
                <View style={(styles.cardBody, {gap: 4, paddingRight: 20})}>
                  <Text style={styles.gameName}>{game.name}</Text>
                  <Text>
                    Play Time:{' '}
                    <Text style={styles.bold}>{game.playtime_forever}</Text>{' '}
                    hour
                    {game.playtime_forever > 1 ? 's' : ''}
                  </Text>
                  <Text>
                    On Windows:{' '}
                    <Text style={styles.bold}>
                      {game.playtime_windows_forever}
                    </Text>{' '}
                    hour
                    {game.playtime_windows_forever > 1 ? 's' : ''}
                  </Text>
                  <Text>
                    On Linux:{' '}
                    <Text style={styles.bold}>
                      {game.playtime_linux_forever}
                    </Text>{' '}
                    hour
                    {game.playtime_linux_forever > 1 ? 's' : ''}
                  </Text>
                  <Text>
                    On Mac:{' '}
                    <Text style={styles.bold}>{game.playtime_mac_forever}</Text>{' '}
                    hour
                    {game.playtime_mac_forever > 1 ? 's' : ''}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setAchievements(game.achievements.achievements);
                      setModalVisible(true);
                    }}
                    style={[
                      styles.button,
                      styles.buttonFlexBox,
                      {padding: 0, height: 40},
                    ]}>
                    <View style={[styles.content, styles.buttonFlexBox]}>
                      <Text style={[styles.label, styles.labelTypo]}>
                        Total Achievements:{' '}
                        <Text style={styles.bold}>
                          {game.achievements.total}
                        </Text>{' '}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            ))
          }
        </ScrollView>
      )}
    </>
  );
}
const Color = {
  qBLightAccentColor: '#332fed',
  white: '#fff',
  black: '#000',
};
const Padding = {
  p_xl: 20,
  p_base: 16,
};
const FontSize = {
  qBBodyEmphasized_size: 15,
  size_smi: 13,
  qBH2_size: 20,
};
/* border radiuses */
const Border = {
  br_xs: 12,
};
const FontFamily = {
  qBBodyEmphasized: 'Manrope-Bold',
  manropeMedium: 'Manrope-Medium',
};

const styles = StyleSheet.create({
  bold: {
    fontWeight: '700',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 10,
  },
  buttonContainer: {
    height: 50,
    width: '82%',
  },
  card: {
    width: '99%',
    // height: '20%',
    marginLeft: 2,
    // marginRight: 7,
    marginBottom: 10,
    padding: 12,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 5,
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: Color.white,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowRadius: 16,
    elevation: 16,
    shadowOpacity: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderWidth: 1,
    overflow: 'hidden',
  },
  gameName: {
    fontWeight: '700',
    fontSize: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  cardHeader: {
    // height: '100%',
    width: 85,
    display: 'flex',
    justifyContent: 'center',
    borderRightWidth: 4,
    borderStyle: 'dotted',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  cardBody: {},
  button: {
    borderRadius: Border.br_xs,
    backgroundColor: Color.qBLightAccentColor,
    height: 48,
    flex: 1,
    overflow: 'hidden',
  },
  buttonWrapper: {
    overflow: 'hidden',
  },
  contentSpaceBlock: {
    paddingVertical: 0,
    alignSelf: 'stretch',
  },
  labelTypo: {
    fontFamily: FontFamily.qBBodyEmphasized,
    fontWeight: '700',
    textAlign: 'left',
  },
  buttonFlexBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FontSize.qBBodyEmphasized_size,
    lineHeight: 20,
    color: Color.white,
    marginLeft: 4,
  },
  content: {
    paddingHorizontal: Padding.p_xl,
    paddingVertical: 0,
    alignSelf: 'stretch',
    flexDirection: 'row',
  },
  centeredView: {
    flex: 2,
    flexDirection: 'column',
    // width: 400,
    // justifyContent: 'center',
    // alignItems: 'center',
    marginTop: 22,
    // width: '100%',
  },
  modalView: {
    // margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonOpen: {
    backgroundColor: '#F194FF',
  },
  buttonClose: {
    backgroundColor: '#2196F3',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
});

const Stack = createStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Steam Demo">
        <Stack.Screen name="Steam Demo" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
